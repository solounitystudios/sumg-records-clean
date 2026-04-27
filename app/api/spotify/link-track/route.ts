import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isExecutiveRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isExecutiveRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { songSlug, spotifyTrackId, spotifyUrl } = body as Record<string, unknown>;

  if (typeof songSlug !== "string" || !songSlug.trim()) {
    return NextResponse.json({ error: "songSlug is required" }, { status: 400 });
  }
  if (typeof spotifyTrackId !== "string" || !spotifyTrackId.trim()) {
    return NextResponse.json({ error: "spotifyTrackId is required" }, { status: 400 });
  }

  const sb = await createClient();

  const { data: existing, error: fetchError } = await sb
    .from("songs")
    .select("id, dsp_links")
    .eq("slug", songSlug.trim())
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json(
      { error: `No song found with slug "${songSlug}"` },
      { status: 404 }
    );
  }

  const mergedDspLinks = {
    ...(existing.dsp_links ?? {}),
    spotify: typeof spotifyUrl === "string" ? spotifyUrl.trim() : undefined,
  };

  const { error: updateError } = await sb
    .from("songs")
    .update({
      spotify_track_id: spotifyTrackId.trim(),
      dsp_links: mergedDspLinks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, spotifyTrackId: spotifyTrackId.trim() });
}
