import { supabase } from "./supabase";

export interface AppleMetricsRow {
  id: string;
  entityType: "artist" | "release" | "song";
  entitySlug: string;
  appleId: string;
  metricDate: string;
  plays: number;
  listeners: number;
  shazams: number;
  storefront: string;
  createdAt: string;
}

function toMetrics(r: any): AppleMetricsRow {
  return {
    id: r.id,
    entityType: r.entity_type,
    entitySlug: r.entity_slug,
    appleId: r.apple_id,
    metricDate: r.metric_date,
    plays: r.plays ?? 0,
    listeners: r.listeners ?? 0,
    shazams: r.shazams ?? 0,
    storefront: r.storefront ?? "us",
    createdAt: r.created_at,
  };
}

export async function linkArtistAppleMusic(
  artistSlug: string,
  appleMusicId: string,
  appleMusicUrl: string
): Promise<void> {
  const { error } = await supabase
    .from("artists")
    .update({ apple_music_id: appleMusicId, apple_music_url: appleMusicUrl })
    .eq("slug", artistSlug);
  if (error) throw new Error(`linkArtistAppleMusic: ${error.message}`);
}

export async function linkReleaseAppleMusic(
  releaseSlug: string,
  appleAlbumId: string,
  appleUrl: string
): Promise<void> {
  const { error } = await supabase
    .from("releases")
    .update({ apple_album_id: appleAlbumId, apple_url: appleUrl })
    .eq("slug", releaseSlug);
  if (error) throw new Error(`linkReleaseAppleMusic: ${error.message}`);
}

export async function linkSongAppleMusic(
  songSlug: string,
  appleSongId: string,
  appleUrl: string
): Promise<void> {
  const { error } = await supabase
    .from("songs")
    .update({ apple_song_id: appleSongId, apple_url: appleUrl })
    .eq("slug", songSlug);
  if (error) throw new Error(`linkSongAppleMusic: ${error.message}`);
}

export async function getAppleMetricsForEntity(
  entitySlug: string,
  limit = 30
): Promise<AppleMetricsRow[]> {
  const { data, error } = await supabase
    .from("apple_metrics_daily")
    .select("*")
    .eq("entity_slug", entitySlug)
    .order("metric_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getAppleMetricsForEntity: ${error.message}`);
  return (data ?? []).map(toMetrics);
}

export async function upsertAppleMetrics(row: Omit<AppleMetricsRow, "id" | "createdAt">): Promise<void> {
  const { error } = await supabase.from("apple_metrics_daily").upsert(
    {
      entity_type: row.entityType,
      entity_slug: row.entitySlug,
      apple_id: row.appleId,
      metric_date: row.metricDate,
      plays: row.plays,
      listeners: row.listeners,
      shazams: row.shazams,
      storefront: row.storefront,
    },
    { onConflict: "entity_slug,metric_date,storefront" }
  );
  if (error) throw new Error(`upsertAppleMetrics: ${error.message}`);
}

export async function getRecentAppleMetrics(limit = 50): Promise<AppleMetricsRow[]> {
  const { data, error } = await supabase
    .from("apple_metrics_daily")
    .select("*")
    .order("metric_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getRecentAppleMetrics: ${error.message}`);
  return (data ?? []).map(toMetrics);
}
