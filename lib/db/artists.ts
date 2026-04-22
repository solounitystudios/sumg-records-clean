import { supabase } from "./supabase"
import type { Artist } from "@/lib/data"

const SELECT =
  "id, slug, name, role, genre, bio, tags, monthly_listeners, total_streams, release_count, profile_image_url"

type ArtistRow = {
  id: string
  slug: string
  name: string
  role: string
  genre: string
  bio: string
  tags: string[] | null
  monthly_listeners: number
  total_streams: number
  release_count: number
  profile_image_url: string | null
}

function toArtist(row: ArtistRow): Artist {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role,
    genre: row.genre,
    bio: row.bio,
    tags: row.tags ?? [],
    monthlyListeners: row.monthly_listeners,
    totalStreams: row.total_streams,
    releaseCount: row.release_count,
    profileImageUrl: row.profile_image_url,
  }
}

export async function getArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from("artists")
    .select(SELECT)
    .order("sort_order")
  if (error) throw new Error(`getArtists: ${error.message}`)
  return (data as ArtistRow[]).map(toArtist)
}

export async function getArtistBySlug(slug: string): Promise<Artist | undefined> {
  const { data, error } = await supabase
    .from("artists")
    .select(SELECT)
    .eq("slug", slug)
    .single()
  if (error) {
    if (error.code === "PGRST116") return undefined
    throw new Error(`getArtistBySlug: ${error.message}`)
  }
  return toArtist(data as ArtistRow)
}
