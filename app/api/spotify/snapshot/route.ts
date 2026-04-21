/**
 * POST /api/spotify/snapshot
 *
 * Takes a Spotify follower + popularity snapshot for all artists that have a
 * Spotify artist ID stored in their `social_links.spotify` URL.
 *
 * Designed to be called by a Vercel cron job (vercel.json `crons` config) or
 * triggered manually from the admin UI.
 *
 * Requires:
 *   SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET (server-side env vars)
 *   NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * Optional — protects the endpoint from unauthorized callers:
 *   CRON_SECRET — if set, the request must include
 *   `Authorization: Bearer <CRON_SECRET>` header (Vercel cron sends this
 *   automatically when configured in vercel.json).
 */

import { NextResponse } from "next/server";
import { getAllArtists } from "@/lib/cms/index";
import { upsertSpotifySnapshot } from "@/lib/cms/index";
import { getSpotifyArtist, isSpotifyConfigured } from "@/lib/spotify";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // no secret configured — open (dev only)
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

// ─── Spotify ID extractor ─────────────────────────────────────────────────────

/**
 * Extracts the Spotify artist ID from a spotify.com URL or bare ID.
 * Handles: https://open.spotify.com/artist/<id>, spotify:artist:<id>, or raw <id>
 */
function extractSpotifyId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const urlMatch = value.match(/spotify\.com\/artist\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = value.match(/^spotify:artist:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];
  if (/^[A-Za-z0-9]{22}$/.test(value)) return value;
  return undefined;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSpotifyConfigured()) {
    return NextResponse.json(
      { error: "Spotify credentials not configured (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET)." },
      { status: 503 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  let artists;
  try {
    artists = await getAllArtists();
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to load artists: ${String(err)}` },
      { status: 500 }
    );
  }

  const results: { slug: string; status: "ok" | "skipped" | "error"; detail?: string }[] = [];

  for (const artist of artists) {
    const spotifyId = extractSpotifyId(artist.socialLinks?.spotify);
    if (!spotifyId) {
      results.push({ slug: artist.slug, status: "skipped", detail: "no spotify link" });
      continue;
    }

    try {
      const data = await getSpotifyArtist(spotifyId);
      await upsertSpotifySnapshot({
        artistSlug: artist.slug,
        spotifyId,
        followers: data.followers,
        popularity: data.popularity,
        snapshotDate: today,
      });
      results.push({ slug: artist.slug, status: "ok" });
    } catch (err) {
      results.push({ slug: artist.slug, status: "error", detail: String(err) });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    snapshotDate: today,
    total: results.length,
    ok,
    skipped,
    errors,
    results,
  });
}

// GET for quick health check / manual browser trigger in dev
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    status: "ready",
    spotifyConfigured: isSpotifyConfigured(),
    message: "POST to this endpoint to take a Spotify snapshot.",
  });
}
