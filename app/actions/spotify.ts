"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getSpotifyArtist } from "@/lib/spotify";
import { supabase } from "@/lib/db/supabase";

export interface SpotifyRefreshResult {
  ok: boolean;
  followers?: number;
  popularity?: number;
  genres?: string[];
  error?: string;
}

/**
 * Fetch live Spotify stats for a linked artist, cache them on the artist row,
 * and insert a snapshot row for historical tracking.
 * Requires admin role.
 */
export async function refreshArtistSpotifySnapshot(
  artistSlug: string
): Promise<SpotifyRefreshResult> {
  await requireAdmin();

  const { data: artistRow } = await supabase
    .from("artists")
    .select("spotify_id")
    .eq("slug", artistSlug)
    .maybeSingle();

  const spotifyId = artistRow?.spotify_id as string | null | undefined;
  if (!spotifyId) {
    return { ok: false, error: "Artist has no Spotify ID linked" };
  }

  const spotifyArtist = await getSpotifyArtist(spotifyId);
  if (!spotifyArtist) {
    return { ok: false, error: "Spotify API unavailable or artist not found" };
  }

  const now = new Date().toISOString();

  // Cache latest stats on the artist row (best-effort — column may not exist yet)
  await supabase
    .from("artists")
    .update({
      spotify_followers: spotifyArtist.followers.total,
      spotify_popularity: spotifyArtist.popularity,
      spotify_last_synced_at: now,
      updated_at: now,
    })
    .eq("slug", artistSlug);

  // Insert snapshot (best-effort — table may not exist in older deployments)
  await supabase.from("artist_spotify_snapshots").insert({
    id: crypto.randomUUID(),
    artist_slug: artistSlug,
    spotify_id: spotifyId,
    followers: spotifyArtist.followers.total,
    popularity: spotifyArtist.popularity,
    genres: spotifyArtist.genres,
    snapshot_at: now,
  });

  revalidatePath("/admin/spotify");
  revalidatePath("/admin/artists");

  return {
    ok: true,
    followers: spotifyArtist.followers.total,
    popularity: spotifyArtist.popularity,
    genres: spotifyArtist.genres,
  };
}
