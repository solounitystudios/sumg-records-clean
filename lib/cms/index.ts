import { createClient } from "@supabase/supabase-js";
import { CMSArtist, CMSBrand, CMSProducer, CMSRelease, CMSSong, RoyaltyStatement, SpotifySnapshot } from "@/lib/types";
import { rowToArtist, rowToProducer, rowToBrand, rowToRelease, rowToSong, rowToRoyaltyStatement, rowToSpotifySnapshot } from "./mappers";
import { artists as rawArtists } from "@/data/artists";
import { brands as rawBrands } from "@/data/brands";
import { producers as rawProducers } from "@/data/producers";
import { releases as rawReleases } from "@/data/releases";
import { songs as rawSongs } from "@/data/songs";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url?.startsWith("https://") || !key) return null;
  return createClient(url, key);
}

// ─── Releases ────────────────────────────────────────────────────────────────

export async function getPublishedReleases(): Promise<CMSRelease[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("releases")
      .select("*")
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) {
      return data
        .map(rowToRelease)
        .filter((r) => {
          if (!r.publishAt) return true;
          return new Date(r.publishAt) <= new Date();
        });
    }
    if (error) console.error("[cms] releases:", error.message);
  }
  return (rawReleases as CMSRelease[])
    .filter((r) => r.status === "published" && r.isVisible)
    .filter((r) => {
      if (!r.publishAt) return true;
      return new Date(r.publishAt) <= new Date();
    });
}

export async function getReleaseBySlug(slug: string): Promise<CMSRelease | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("releases")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .eq("is_visible", true)
      .maybeSingle();
    if (!error && data) return rowToRelease(data);
    if (error) console.error("[cms] release by slug:", error.message);
  }
  return (rawReleases as CMSRelease[]).find(
    (r) => r.slug === slug && r.status === "published" && r.isVisible
  );
}

export async function getArtistReleases(artistSlug: string): Promise<CMSRelease[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("releases")
      .select("*")
      .eq("artist_slug", artistSlug)
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) {
      return data
        .map(rowToRelease)
        .filter((r) => {
          if (!r.publishAt) return true;
          return new Date(r.publishAt) <= new Date();
        });
    }
    if (error) console.error("[cms] artist releases:", error.message);
  }
  const published = (rawReleases as CMSRelease[])
    .filter((r) => r.status === "published" && r.isVisible)
    .filter((r) => {
      if (!r.publishAt) return true;
      return new Date(r.publishAt) <= new Date();
    });
  return published.filter((r) => r.artistSlug === artistSlug);
}

// ─── Artists ─────────────────────────────────────────────────────────────────

export async function getAllArtists(): Promise<CMSArtist[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("artists")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) return data.map(rowToArtist);
    if (error) console.error("[cms] artists:", error.message);
  }
  return rawArtists as CMSArtist[];
}

export async function getArtistBySlug(slug: string): Promise<CMSArtist | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("artists")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!error && data) return rowToArtist(data);
    if (error) console.error("[cms] artist by slug:", error.message);
  }
  return (rawArtists as CMSArtist[]).find((a) => a.slug === slug);
}

// ─── Producers ───────────────────────────────────────────────────────────────

export async function getAllProducers(): Promise<CMSProducer[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("producers")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) return data.map(rowToProducer);
    if (error) console.error("[cms] producers:", error.message);
  }
  return rawProducers as CMSProducer[];
}

export async function getProducerBySlug(slug: string): Promise<CMSProducer | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("producers")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!error && data) return rowToProducer(data);
    if (error) console.error("[cms] producer by slug:", error.message);
  }
  return (rawProducers as CMSProducer[]).find((p) => p.slug === slug);
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export async function getAllBrands(): Promise<CMSBrand[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("brands")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) return data.map(rowToBrand);
    if (error) console.error("[cms] brands:", error.message);
  }
  return rawBrands as CMSBrand[];
}

export async function getBrandBySlug(slug: string): Promise<CMSBrand | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("brands")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!error && data) return rowToBrand(data);
    if (error) console.error("[cms] brand by slug:", error.message);
  }
  return (rawBrands as CMSBrand[]).find((b) => b.slug === slug);
}

// ─── Songs ───────────────────────────────────────────────────────────────────

export async function getPublicSongs(): Promise<CMSSong[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("songs")
      .select("*")
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) return data.map(rowToSong);
    if (error) console.error("[cms] songs:", error.message);
  }
  return (rawSongs as CMSSong[]).filter((s) => s.status === "published" && s.isVisible);
}

export async function getSongBySlug(slug: string): Promise<CMSSong | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("songs")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .eq("is_visible", true)
      .maybeSingle();
    if (!error && data) return rowToSong(data);
    if (error) console.error("[cms] song by slug:", error.message);
  }
  return (rawSongs as CMSSong[]).find(
    (s) => s.slug === slug && s.status === "published" && s.isVisible
  );
}

export async function getSongsForArtist(artistSlug: string): Promise<CMSSong[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("songs")
      .select("*")
      .eq("artist_slug", artistSlug)
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) return data.map(rowToSong);
    if (error) console.error("[cms] songs for artist:", error.message);
  }
  return (rawSongs as CMSSong[]).filter(
    (s) => s.artistSlug === artistSlug && s.status === "published" && s.isVisible
  );
}

export async function getSongsForRelease(releaseSlug: string): Promise<CMSSong[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("songs")
      .select("*")
      .eq("release_slug", releaseSlug)
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) return data.map(rowToSong);
    if (error) console.error("[cms] songs for release:", error.message);
  }
  return (rawSongs as CMSSong[]).filter(
    (s) => s.releaseSlug === releaseSlug && s.status === "published" && s.isVisible
  );
}

export async function getAllPublicSongSlugs(): Promise<string[]> {
  const songs = await getPublicSongs();
  return songs.map((s) => s.slug);
}

// ─── Royalty Statements ──────────────────────────────────────────────────────

/**
 * Returns all royalty statement rows, newest first.
 * Falls back to an empty array when Supabase is not configured.
 */
export async function getRoyaltyStatements(): Promise<RoyaltyStatement[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("royalty_statements")
    .select("*")
    .order("period_start", { ascending: false });
  if (error) {
    console.error("[cms] royalty_statements:", error.message);
    return [];
  }
  return (data ?? []).map(rowToRoyaltyStatement);
}

/**
 * Bulk-inserts an array of royalty statement rows.
 * Returns the number of rows successfully inserted, or throws on error.
 */
export async function insertRoyaltyStatements(
  rows: Omit<RoyaltyStatement, "id" | "createdAt">[]
): Promise<number> {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured.");

  const dbRows = rows.map((r) => ({
    id: crypto.randomUUID(),
    source: r.source,
    period_start: r.periodStart,
    period_end: r.periodEnd,
    artist_slug: r.artistSlug ?? null,
    release_slug: r.releaseSlug ?? null,
    song_isrc: r.songIsrc ?? null,
    song_title: r.songTitle,
    streams: r.streams ?? null,
    gross_revenue: r.grossRevenue,
    net_revenue: r.netRevenue,
    currency: r.currency,
    territory: r.territory ?? null,
    raw_row: r.rawRow ?? null,
    uploaded_by: r.uploadedBy ?? null,
  }));

  const { error, count } = await sb
    .from("royalty_statements")
    .insert(dbRows, { count: "exact" });

  if (error) throw new Error(error.message);
  return count ?? rows.length;
}

// ─── Spotify Snapshots ───────────────────────────────────────────────────────

/**
 * Returns Spotify snapshot rows for a given artist slug, oldest first.
 * Used to render follower/popularity trend charts.
 */
export async function getSpotifySnapshots(artistSlug: string): Promise<SpotifySnapshot[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("spotify_snapshots")
    .select("*")
    .eq("artist_slug", artistSlug)
    .order("snapshot_date", { ascending: true });
  if (error) {
    console.error("[cms] spotify_snapshots:", error.message);
    return [];
  }
  return (data ?? []).map(rowToSpotifySnapshot);
}

/**
 * Upserts a Spotify snapshot (one per artist per day — duplicate dates are
 * ignored via ON CONFLICT DO NOTHING at the DB level; the caller can simply
 * insert and let the DB discard duplicates).
 */
export async function upsertSpotifySnapshot(
  snapshot: Omit<SpotifySnapshot, "id" | "createdAt">
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured.");

  const { error } = await sb.from("spotify_snapshots").insert({
    artist_slug: snapshot.artistSlug,
    spotify_id: snapshot.spotifyId,
    followers: snapshot.followers,
    popularity: snapshot.popularity,
    snapshot_date: snapshot.snapshotDate,
  });

  // Silently ignore unique-constraint violations (already have today's snapshot)
  // PostgreSQL error code 23505 = unique_violation
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(error.message);
  }
}

