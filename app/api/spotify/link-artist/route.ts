import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractSpotifyArtistId } from "@/lib/spotify";

/**
 * POST /api/spotify/link-artist
 *
 * Body: { artistSlug: string; spotifyUrl: string }
 *
 * Updates the SUMG artist record to set:
 *   - artists.spotify_id      → bare 22-char ID extracted from spotifyUrl
 *   - artists.social_links    → merged with { spotify: spotifyUrl }
 *
 * Requires an authenticated Supabase session (admin user).
 */
export async function POST(request: NextRequest) {
  const sb = await createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { artistSlug, spotifyUrl } = body as Record<string, unknown>;

  if (typeof artistSlug !== "string" || !artistSlug.trim()) {
    return NextResponse.json({ error: "artistSlug is required" }, { status: 400 });
  }

  if (typeof spotifyUrl !== "string" || !spotifyUrl.trim()) {
    return NextResponse.json({ error: "spotifyUrl is required" }, { status: 400 });
  }

  const spotifyId = extractSpotifyArtistId(spotifyUrl);
  if (!spotifyId) {
    return NextResponse.json(
      { error: "spotifyUrl does not contain a valid 22-char Spotify artist ID" },
      { status: 400 }
    );
  }

  // Fetch the existing artist row to merge social_links safely
  const { data: existing, error: fetchError } = await sb
    .from("artists")
    .select("id, social_links")
    .eq("slug", artistSlug.trim())
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json(
      { error: `No artist found with slug "${artistSlug}"` },
      { status: 404 }
    );
  }

  const mergedSocialLinks = {
    ...(existing.social_links ?? {}),
    spotify: spotifyUrl.trim(),
  };

  const { error: updateError } = await sb
    .from("artists")
    .update({
      spotify_id: spotifyId,
      social_links: mergedSocialLinks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, spotifyId });
}
