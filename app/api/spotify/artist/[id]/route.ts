import { NextRequest, NextResponse } from "next/server";
import {
  getSpotifyArtist,
  getSpotifyArtistTopTracks,
  getSpotifyArtistAlbums,
} from "@/lib/spotify";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  if (!/^[A-Za-z0-9]{22}$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid Spotify artist ID — must be 22 alphanumeric characters" },
      { status: 400 }
    );
  }

  const [artist, topTracks, albums] = await Promise.all([
    getSpotifyArtist(id),
    getSpotifyArtistTopTracks(id),
    getSpotifyArtistAlbums(id),
  ]);

  if (!artist) {
    return NextResponse.json(
      { error: "Artist not found or Spotify API unavailable" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { artist, topTracks, albums },
    { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" } }
  );
}
