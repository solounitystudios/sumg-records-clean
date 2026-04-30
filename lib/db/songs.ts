import { supabase } from "./supabase"
import type { CMSSong } from "@/lib/types"
import { rowToSong } from "@/lib/cms/mappers"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSong = (r: any): CMSSong => rowToSong(r)

export async function getAllSongs(): Promise<CMSSong[]> {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`getAllSongs: ${error.message}`)
  return (data ?? []).map(toSong)
}

export async function getSongById(id: string): Promise<CMSSong | null> {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return toSong(data)
}

export async function getSongBySlug(slug: string): Promise<CMSSong | null> {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("slug", slug)
    .single()
  if (error) return null
  return toSong(data)
}

export interface CreateSongInput {
  slug: string
  title: string
  artist_slug: string
  artist_name: string
  release_slug?: string
  genre?: string
  duration?: string
  track_number?: number
  is_explicit?: boolean
  isrc?: string
  status?: string
}

export async function createSong(input: CreateSongInput): Promise<CMSSong> {
  const { data, error } = await supabase
    .from("songs")
    .insert({
      ...input,
      status: input.status ?? "draft",
      is_visible: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw new Error(`createSong: ${error.message}`)
  return toSong(data)
}

export interface UpdateSongInput {
  title?: string
  genre?: string
  duration?: string
  track_number?: number
  is_explicit?: boolean
  isrc?: string
  status?: string
  is_visible?: boolean
  audio_url?: string
  lyrics?: string
  release_slug?: string
}

export async function updateSong(id: string, input: UpdateSongInput): Promise<void> {
  const { error } = await supabase
    .from("songs")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(`updateSong: ${error.message}`)
}
