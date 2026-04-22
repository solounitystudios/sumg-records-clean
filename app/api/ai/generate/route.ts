import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIContent, AIContentType, AI_CONTENT_TYPES } from "@/lib/ai/generate";
import { getArtistBySlug } from "@/lib/cms/index";

/**
 * POST /api/ai/generate
 *
 * Body:
 *   artistSlug   — slug of the SUMG artist to generate content for
 *   contentType  — one of the AIContentType values
 *   context      — optional extra context (e.g. song title, interview question)
 *
 * Requires an authenticated Supabase CMS session.
 * Returns: { ok: true, content: string, contentType: string }
 *       or { ok: false, error: string }
 */

const VALID_CONTENT_TYPES = new Set<string>(AI_CONTENT_TYPES.map((t) => t.value));

export async function POST(request: NextRequest) {
  // ── Auth gate ──────────────────────────────────────────────────────────────
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const CMS_ROLES = ["admin", "editor", "media_manager", "release_manager"] as const;
  const role = (user.app_metadata?.role as string | undefined) ?? "";
  if (!CMS_ROLES.includes(role as (typeof CMS_ROLES)[number])) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { artistSlug, contentType, context } = body as Record<string, unknown>;

  if (typeof artistSlug !== "string" || !artistSlug.trim()) {
    return NextResponse.json({ ok: false, error: "artistSlug is required" }, { status: 400 });
  }
  if (typeof contentType !== "string" || !VALID_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json(
      {
        ok: false,
        error: `contentType must be one of: ${[...VALID_CONTENT_TYPES].join(", ")}`,
      },
      { status: 400 }
    );
  }
  if (context !== undefined && typeof context !== "string") {
    return NextResponse.json({ ok: false, error: "context must be a string" }, { status: 400 });
  }

  // ── Load artist persona ────────────────────────────────────────────────────
  const artist = await getArtistBySlug(artistSlug.trim());
  if (!artist) {
    return NextResponse.json(
      { ok: false, error: `No artist found with slug "${artistSlug}"` },
      { status: 404 }
    );
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  const result = await generateAIContent({
    contentType: contentType as AIContentType,
    artist: {
      name: artist.name,
      genre: artist.genre,
      role: artist.role,
      bio: artist.bio,
      longBio: artist.longBio,
      instagramUrl: artist.socialLinks?.instagram,
      spotifyUrl: artist.socialLinks?.spotify,
    },
    context: typeof context === "string" ? context : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json(result, { status: 200 });
}
