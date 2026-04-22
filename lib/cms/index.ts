import { createClient } from "@supabase/supabase-js";
import { CMSArtist, CMSBrand, CMSProducer, CMSRelease, CMSSong, RoyaltyStatement, SpotifySnapshot } from "@/lib/types";
import type { MusicBrainzRecording } from "@/lib/integrations/musicbrainz";
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

// ─── MusicBrainz ISRC enrichment ─────────────────────────────────────────────

/**
 * Parses a "M:SS" duration string into milliseconds.
 * Returns null if the string cannot be parsed.
 */
function parseDurationToMs(s: string): number | null {
  const m = s.match(/^(\d+):(\d{2})$/);
  if (!m) return null;
  return (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) * 1000;
}

/**
 * Enriches a song record in Supabase with metadata from MusicBrainz.
 *
 * Strategy:
 *   1. If the song already has an ISRC, call `lookupByISRC` (authoritative path).
 *   2. Otherwise, call `lookupByArtistTitle` as a fallback (less authoritative).
 *   3. On a high-confidence hit, write `musicbrainz_id` and optionally `duration`
 *      (when the song lacked one and the MusicBrainz duration is within tolerance).
 *
 * ISRC backfill is intentionally omitted: ISRC is a legal royalty identifier
 * that must come from an authoritative source (e.g. distributor import), not
 * inferred from a fuzzy text search.
 *
 * Safe to call multiple times — skips everything when `musicbrainz_id` is
 * already set.  Returns null when Supabase is not configured.
 *
 * Failure paths:
 *   - Song not found                 → `{ enriched: false, error: "Song not found" }`
 *   - Song already has MBID          → `{ enriched: false, skipped: true, mbid }`
 *   - Ambiguous / low-confidence     → no write, `{ enriched: false, ambiguous: true, ambiguousReason, candidates }`
 *   - Duration mismatch > 10 s       → no write, `{ enriched: false, rejected: true, rejectedReason }`
 *   - Unparsable existing duration   → no write, `{ enriched: false, rejected: true, rejectedReason }`
 *   - MusicBrainz returns no result  → `{ enriched: false }`
 *   - MusicBrainz network error      → logs, `{ enriched: false, error }`
 *   - Supabase write error           → throws
 */
export async function enrichSongFromMusicBrainz(songId: string): Promise<{
  enriched: boolean;
  /** Song already had a MBID — nothing was written. */
  skipped?: boolean;
  /** A high-confidence match was found but rejected due to a safety guard (e.g. duration mismatch). */
  rejected?: boolean;
  /** Human-readable reason for a `rejected` outcome. */
  rejectedReason?: string;
  ambiguous?: boolean;
  /** Human-readable reason for an `ambiguous` outcome. */
  ambiguousReason?: string;
  candidates?: MusicBrainzRecording[];
  mbid?: string;
  durationWritten?: string;
  error?: string;
} | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;

  // Fetch the current song row
  const { data: row, error: fetchErr } = await sb
    .from("songs")
    .select("id, title, artist_name, isrc, musicbrainz_id, duration")
    .eq("id", songId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) return { enriched: false, error: "Song not found" };

  // Skip if we already have a MBID — idempotent, return distinct "skipped" signal.
  if (row.musicbrainz_id) return { enriched: false, skipped: true, mbid: row.musicbrainz_id };

  const { lookupByISRC, lookupByArtistTitle } = await import(
    "@/lib/integrations/musicbrainz"
  );

  // Prefer ISRC lookup; fall back to artist/title search.
  // Always bypass the ISR cache so stale not-found results are not replayed.
  const result = row.isrc
    ? await lookupByISRC(row.isrc, {
        noCache: true,
        titleHint: row.title ?? undefined,
        artistHint: row.artist_name ?? undefined,
      })
    : await lookupByArtistTitle(row.artist_name ?? "", row.title ?? "", {
        noCache: true,
      });

  // Ambiguous result — surface candidates for human review, do not write.
  if (result.found === "ambiguous") {
    console.warn(
      `[musicbrainz] enrichSong(${songId}): ambiguous —`,
      result.reason
    );
    return { enriched: false, ambiguous: true, ambiguousReason: result.reason, candidates: result.candidates };
  }

  if (!result.found) {
    if (result.error) {
      console.warn(`[musicbrainz] enrichSong(${songId}):`, result.error);
      return { enriched: false, error: result.error };
    }
    return { enriched: false };
  }

  const { recording } = result;

  // Duration mismatch guard: if the song already has a duration, reject any
  // MusicBrainz recording whose duration differs by more than 10 seconds.
  //
  // If the stored duration is non-empty but cannot be parsed into milliseconds
  // (i.e. it is in an unrecognised format), and MusicBrainz has a duration for
  // the candidate recording, we must also reject — silently proceeding would
  // bypass the guard entirely and risk writing a wrong MBID.
  if (row.duration && recording.durationMs !== undefined) {
    const existingMs = parseDurationToMs(row.duration);
    if (existingMs === null) {
      // Unparsable format — cannot safely compare; reject rather than skip guard.
      console.warn(
        `[musicbrainz] enrichSong(${songId}): cannot parse existing duration ` +
          `"${row.duration}" — rejecting to avoid bypassing the duration guard`
      );
      return {
        enriched: false,
        rejected: true,
        rejectedReason: `existing duration "${row.duration}" is in an unrecognised format — verify and correct it before enriching`,
      };
    }
    if (Math.abs(recording.durationMs - existingMs) > 10_000) {
      console.warn(
        `[musicbrainz] enrichSong(${songId}): duration mismatch ` +
          `(existing ${row.duration}, MB ${recording.duration ?? recording.durationMs + "ms"})`
      );
      return {
        enriched: false,
        rejected: true,
        rejectedReason: `duration mismatch (song: ${row.duration}, MusicBrainz: ${recording.duration ?? Math.round((recording.durationMs ?? 0) / 1000) + "s"})`,
      };
    }
  }

  // Build the update payload — only fields we intend to write.
  const update: Record<string, string> = {
    musicbrainz_id: recording.mbid,
    updated_at: new Date().toISOString(),
  };

  let durationWritten: string | undefined;

  // Back-fill duration only when the song has none and MB has a value.
  if (!row.duration && recording.duration) {
    update.duration = recording.duration;
    durationWritten = recording.duration;
  }

  const { error: updateErr } = await sb
    .from("songs")
    .update(update)
    .eq("id", songId);

  if (updateErr) throw new Error(updateErr.message);

  return {
    enriched: true,
    mbid: recording.mbid,
    durationWritten,
  };
}


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

