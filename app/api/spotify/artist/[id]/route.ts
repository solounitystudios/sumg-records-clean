import { NextRequest, NextResponse } from "next/server";
import {
  getSpotifyArtist,
  getSpotifyArtistTopTracks,
  getSpotifyArtistAlbums,
} from "@/lib/spotify";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/spotify/artist/[id]
 *
 * Server-side proxy returning combined Spotify data for one artist:
 *   { artist, topTracks, albums }
 *
 * Credentials stay on the server; only sanitised results reach the client.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!id || !/^[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid Spotify artist ID" }, { status: 400 });
  }

  try {
    const [artist, topTracks, albums] = await Promise.all([
      getSpotifyArtist(id),
      getSpotifyArtistTopTracks(id),
      getSpotifyArtistAlbums(id, 6),
    ]);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json({ artist, topTracks, albums }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Spotify artist lookup failed", detail: message },
      { status: 500 }
    );
  }
}
