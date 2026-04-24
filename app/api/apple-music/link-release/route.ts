import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isExecutiveRole } from "@/lib/auth";
import { linkReleaseAppleMusic } from "@/lib/db/appleMusic";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isExecutiveRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { releaseSlug, appleAlbumId, appleUrl } = await req.json();

    if (!releaseSlug || !appleAlbumId || !appleUrl) {
      return NextResponse.json(
        { error: "Missing releaseSlug, appleAlbumId, or appleUrl" },
        { status: 400 }
      );
    }

    await linkReleaseAppleMusic(releaseSlug, appleAlbumId, appleUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/apple-music/link-release]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
