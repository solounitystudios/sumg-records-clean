import { NextRequest, NextResponse } from "next/server";
import { searchSpotifyArtists } from "@/lib/spotify";

/**
 * GET /api/spotify/search?q=<query>&limit=<n>
 *
 * Server-side proxy for Spotify artist search.
 * Credentials stay on the server; only sanitised results reach the client.
 *
 * Route visibility: public utility — callable from any browser context.
 *
 * Production hardening checklist (not yet implemented):
 *   - Rate limiting: add an edge middleware or Upstash/Redis limiter (e.g. 30 req/min
 *     per IP) before deploying at scale to avoid upstream Spotify 429s.
 *   - Caching: consider a short-lived route-level cache (stale-while-revalidate 60s)
 *     for repeated identical queries.
 *   - Auth gating: if this should be admin-only, verify the Supabase session cookie
 *     before calling Spotify (see app/api/auth pattern for reference).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing required query parameter: q" },
      { status: 400 }
    );
  }

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam), 20) : 5;

  try {
    const artists = await searchSpotifyArtists(q, limit);
    return NextResponse.json({ artists }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Spotify search failed", detail: message },
      { status: 500 }
    );
  }
}
