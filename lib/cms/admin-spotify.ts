import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ArtistSpotifySnapshot } from "@/lib/types";

/**
 * artist_spotify_snapshots is CMS-role-gated for both read and write in
 * production RLS (is_cms_role()) — it has no public-read policy, unlike the
 * public-content functions in lib/cms/index.ts. These two functions were
 * previously defined there and used the same anon/publishable, session-less
 * client that the genuinely public functions correctly use — which meant
 * they only worked because the SELECT policy was (incorrectly) open to
 * anon. Moved here, using the session-aware server client instead, so RLS's
 * is_cms_role() check evaluates against the real logged-in admin's JWT.
 * The `server-only` import makes it a build-time error to ever import this
 * module into client-bundled code.
 */

function rowToArtistSpotifySnapshot(r: any): ArtistSpotifySnapshot {
  return {
    id: r.id,
    artistSlug: r.artist_slug,
    spotifyId: r.spotify_id,
    followers: r.followers,
    popularity: r.popularity ?? 0,
    snapshotAt: r.snapshot_at,
  };
}

/**
 * Return all follower snapshots for a given artist, newest first.
 * Falls back to an empty array on failure. Admin/CMS-role only — the
 * caller must already be inside an authenticated admin route (every
 * app/admin/** route is gated by requireAdmin() in app/admin/layout.tsx).
 */
export async function getArtistSpotifySnapshots(artistSlug: string): Promise<ArtistSpotifySnapshot[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("artist_spotify_snapshots")
    .select("*")
    .eq("artist_slug", artistSlug)
    .order("snapshot_at", { ascending: false });
  if (error) {
    console.error("[cms/admin-spotify] artist spotify snapshots:", error.message);
    return [];
  }
  return (data ?? []).map(rowToArtistSpotifySnapshot);
}

/**
 * Insert a new follower snapshot row. Returns the inserted row or null on
 * failure. Not currently called anywhere — app/actions/spotify.ts's
 * refreshArtistSpotifySnapshot() is the live write path and uses the
 * service-role client directly. Kept and fixed here for consistency so it
 * isn't a landmine if it's ever wired up later.
 */
export async function insertArtistSpotifySnapshot(
  snap: Omit<ArtistSpotifySnapshot, "id">
): Promise<ArtistSpotifySnapshot | null> {
  const sb = await createClient();
  const id = crypto.randomUUID();
  const { data, error } = await sb
    .from("artist_spotify_snapshots")
    .insert({
      id,
      artist_slug: snap.artistSlug,
      spotify_id: snap.spotifyId,
      followers: snap.followers,
      popularity: snap.popularity,
      snapshot_at: snap.snapshotAt,
    })
    .select()
    .maybeSingle();
  if (error) {
    console.error("[cms/admin-spotify] insert artist spotify snapshot:", error.message);
    return null;
  }
  return data ? rowToArtistSpotifySnapshot(data) : null;
}
