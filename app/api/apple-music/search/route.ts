import { NextRequest, NextResponse } from "next/server";
import { searchAppleMusic } from "@/lib/appleMusic";
import { isAppleMusicConfigured } from "@/lib/appleMusic";

export async function GET(req: NextRequest) {
  if (!isAppleMusicConfigured()) {
    return NextResponse.json(
      { error: "Apple Music credentials not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const typesParam = searchParams.get("types") ?? "artists";
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 25);

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  const types = typesParam
    .split(",")
    .filter((t): t is "artists" | "albums" | "songs" =>
      ["artists", "albums", "songs"].includes(t)
    );

  const result = await searchAppleMusic(q, types.length ? types : ["artists"], "us", limit);
  return NextResponse.json(result.results);
}
