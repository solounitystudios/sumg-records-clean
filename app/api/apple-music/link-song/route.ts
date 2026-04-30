import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isExecutiveRole } from "@/lib/auth";
import { linkSongAppleMusic } from "@/lib/db/appleMusic";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isExecutiveRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { songSlug, appleSongId, appleUrl } = await req.json();

    if (!songSlug || !appleSongId || !appleUrl) {
      return NextResponse.json(
        { error: "Missing songSlug, appleSongId, or appleUrl" },
        { status: 400 }
      );
    }

    await linkSongAppleMusic(songSlug, appleSongId, appleUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/apple-music/link-song]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
