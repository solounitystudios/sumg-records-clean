import { NextRequest, NextResponse } from "next/server";
import { searchSpotifyArtists } from "@/lib/spotify";

/**
 * GET /api/spotify/search?q=<query>&limit=<n>
 *
 * Server-side proxy for Spotify artist search.
 * Credentials stay on the server; only sanitised results reach the client.
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
