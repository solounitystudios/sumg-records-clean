import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

  const { releaseSlug, spotifyAlbumId, spotifyUrl } = body as Record<string, unknown>;

  if (typeof releaseSlug !== "string" || !releaseSlug.trim()) {
    return NextResponse.json({ error: "releaseSlug is required" }, { status: 400 });
  }
  if (typeof spotifyAlbumId !== "string" || !spotifyAlbumId.trim()) {
    return NextResponse.json({ error: "spotifyAlbumId is required" }, { status: 400 });
  }
  if (typeof spotifyUrl !== "string" || !spotifyUrl.trim()) {
    return NextResponse.json({ error: "spotifyUrl is required" }, { status: 400 });
  }

  const sb = await createClient();

  const { data: existing, error: fetchError } = await sb
    .from("releases")
    .select("id, dsp_links")
    .eq("slug", releaseSlug.trim())
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json(
      { error: `No release found with slug "${releaseSlug}"` },
      { status: 404 }
    );
  }

  const mergedDspLinks = {
    ...(existing.dsp_links ?? {}),
    spotify: spotifyUrl.trim(),
  };

  const { error: updateError } = await sb
    .from("releases")
    .update({
      dsp_links: mergedDspLinks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Refresh public catalogue, the release detail page, and the admin command center.
  revalidatePath("/releases");
  revalidatePath(`/releases/${releaseSlug.trim()}`);
  revalidatePath("/admin/releases");

  return NextResponse.json({ ok: true, spotifyAlbumId: spotifyAlbumId.trim() });
}
