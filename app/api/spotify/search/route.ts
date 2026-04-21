import { NextRequest, NextResponse } from "next/server";
import { searchSpotify } from "@/lib/spotify";

/**
 * GET /api/spotify/search
 *
 * Query params:
 *   q      — search query (required)
 *   types  — comma-separated: artist, album, track  (default: artist)
 *   limit  — max results per type, 1–50             (default: 10)
 *
 * Calls Spotify server-side so credentials are never exposed to the browser.
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

  const rawTypes = searchParams.get("types") ?? "artist";
  const typeList = rawTypes
    .split(",")
    .map((t: string) => t.trim())
    .filter((t: string): t is "artist" | "album" | "track" =>
      ["artist", "album", "track"].includes(t)
    );

  if (typeList.length === 0) {
    return NextResponse.json(
      { error: "Invalid type parameter — use: artist, album, track" },
      { status: 400 }
    );
  }

  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") ?? 10)), 50);

  const results = await searchSpotify(q, typeList, limit);

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
    },
  });
}
