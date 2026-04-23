import { supabase } from "./supabase"
import type { Release, Track } from "@/lib/data"
import type { CMSRelease } from "@/lib/types"
import { rowToRelease as rowToCMSRelease } from "@/lib/cms/mappers"

const SELECT = "*"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TrackRow = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReleaseRow = Record<string, any>

function toTrack(row: TrackRow): Track {
  return {
    number: row.number,
    title: row.title,
    duration: row.duration,
    streams: row.streams,
  }
}

function toRelease(row: ReleaseRow): Release {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    artistSlug: row.artist_slug,
    artistName: row.artist_name,
    releaseDate: row.release_date,
    type: row.type as Release["type"],
    status: row.status as Release["status"],
    streams: row.streams,
    platforms: row.platforms ?? [],
    accentColor: row.accent_color,
    tracks: (row.tracklist ?? []).map(toTrack),
    spotifyUrl: (row.dsp_links as { spotify?: string } | null)?.spotify ?? null,
  }
}

export async function getReleases(): Promise<Release[]> {
  const { data, error } = await supabase
    .from("releases")
    .select(SELECT)
    .order("release_date", { ascending: false })
  if (error) throw new Error(`getReleases: ${error.message}`)
  return (data as ReleaseRow[]).map(toRelease)
}

export async function getReleaseBySlug(slug: string): Promise<Release | undefined> {
  const { data, error } = await supabase
    .from("releases")
    .select(SELECT)
    .eq("slug", slug)
    .single()
  if (error) {
    if (error.code === "PGRST116") return undefined
    throw new Error(`getReleaseBySlug: ${error.message}`)
  }
  return toRelease(data as ReleaseRow)
}

export async function getArtistReleases(artistSlug: string): Promise<Release[]> {
  const { data, error } = await supabase
    .from("releases")
    .select(SELECT)
    .eq("artist_slug", artistSlug)
    .order("release_date", { ascending: false })
  if (error) throw new Error(`getArtistReleases: ${error.message}`)
  return (data as ReleaseRow[]).map(toRelease)
}

// Returns full CMSRelease type (with rightsMetadata, distributionRecord, etc.)
// Use in admin-only contexts that need publishing/distribution fields.
export async function getAllReleasesAdmin(): Promise<CMSRelease[]> {
  const { data, error } = await supabase
    .from("releases")
    .select(SELECT)
    .order("release_date", { ascending: false })
  if (error) throw new Error(`getAllReleasesAdmin: ${error.message}`)
  return (data as ReleaseRow[]).map(rowToCMSRelease)
}
