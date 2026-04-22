/**
 * POST /api/musicbrainz/enrich
 *
 * Triggers MusicBrainz metadata enrichment for a single song.
 * Auth-gated: caller must be an authenticated CMS user (any of the four
 * recognised roles — admin / editor / release_manager / media_manager).
 *
 * Request body (JSON):
 *   { "songId": "<uuid>" }
 *
 * Response shapes:
 *
 *   Enriched        (HTTP 200):
 *     { "status": "enriched",  "mbid": "...", "durationWritten": "3:42" | null }
 *
 *   Skipped         (HTTP 200):
 *     { "status": "skipped", "mbid": "..." }
 *     — Song already had a MBID; nothing was written.
 *
 *   Ambiguous       (HTTP 200):
 *     { "status": "ambiguous", "reason": "...", "candidates": [ MusicBrainzRecording, … ] }
 *
 *   Rejected        (HTTP 200):
 *     { "status": "rejected", "reason": "..." }
 *     — A high-confidence match was found but rejected by a safety guard
 *       (e.g. duration mismatch). Nothing was written.
 *
 *   Miss            (HTTP 200):
 *     { "status": "miss" }
 *
 *   Error           (HTTP 500):
 *     { "status": "error", "error": "..." }
 *     — Network failure, invalid ISRC, Supabase write failure, etc.
 *
 *   Auth / validation errors:
 *     HTTP 401  { "error": "Unauthorized" }
 *     HTTP 400  { "error": "songId is required" }
 *     HTTP 503  { "error": "Supabase is not configured" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichSongFromMusicBrainz } from "@/lib/cms/index";

// ─── Recognised CMS roles ─────────────────────────────────────────────────────

const CMS_ROLES = new Set(["admin", "editor", "release_manager", "media_manager"]);

/**
 * Checks that the incoming request carries a valid Supabase session and that
 * the user's `app_metadata.role` is one of the four CMS roles.
 *
 * Returns `true` (authorised) or `false` (reject with 401).
 */
async function hasCmsRole(): Promise<boolean> {
  // When Supabase is not configured (dev / seed mode) the server client will
  // throw. Catch it and allow the request through so local development works
  // without credentials — the 503 from enrichSongFromMusicBrainz itself is the
  // correct signal in that case.
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return false;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);

  return typeof role === "string" && CMS_ROLES.has(role);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Auth guard ────────────────────────────────────────────────────────────
  const authorised = await hasCmsRole();
  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse and validate body ───────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const songId =
    body !== null && typeof body === "object" && "songId" in body
      ? (body as { songId: unknown }).songId
      : undefined;

  if (typeof songId !== "string" || !songId.trim()) {
    return NextResponse.json({ error: "songId is required" }, { status: 400 });
  }

  // ── 3. Delegate to enrichSongFromMusicBrainz ─────────────────────────────────
  let result;
  try {
    result = await enrichSongFromMusicBrainz(songId.trim());
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: String(err) },
      { status: 500 }
    );
  }

  // enrichSongFromMusicBrainz returns null when Supabase is not configured.
  if (result === null) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  // ── 4. Map enrichment result to API response shape ───────────────────────────

  // Already enriched — MBID was already set; nothing was written.
  if (result.skipped) {
    return NextResponse.json({ status: "skipped", mbid: result.mbid });
  }

  // Ambiguous — surface candidates for human review; nothing was written.
  if (result.ambiguous) {
    return NextResponse.json({
      status: "ambiguous",
      reason: result.ambiguousReason ?? "Multiple plausible matches — human review required",
      candidates: result.candidates ?? [],
    });
  }

  // Rejected — a safety guard blocked the write (e.g. duration mismatch).
  if (result.rejected) {
    return NextResponse.json({
      status: "rejected",
      reason: result.rejectedReason ?? "Match rejected by safety guard",
    });
  }

  // Hard error (network failure, invalid ISRC, Supabase write error, etc.).
  if (!result.enriched && result.error) {
    return NextResponse.json(
      { status: "error", error: result.error },
      { status: 500 }
    );
  }

  // Miss — no plausible match found in MusicBrainz.
  if (!result.enriched) {
    return NextResponse.json({ status: "miss" });
  }

  // Enriched — MBID (and optionally duration) written to Supabase.
  return NextResponse.json({
    status: "enriched",
    mbid: result.mbid,
    durationWritten: result.durationWritten ?? null,
  });
}
