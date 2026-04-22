import { supabase } from "./supabase"
import type { Release, Track } from "@/lib/data"

const SELECT =
  "id, slug, title, artist_slug, artist_name, release_date, type, status, streams, platforms, accent_color, tracklist"

type TrackRow = {
  number: number
  title: string
  duration: string
  streams: number
}

type ReleaseRow = {
  id: string
  slug: string
  title: string
  artist_slug: string
  artist_name: string
  release_date: string
  type: string
  status: string
  streams: number
  platforms: string[] | null
  accent_color: string
  tracklist: TrackRow[] | null
}

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
