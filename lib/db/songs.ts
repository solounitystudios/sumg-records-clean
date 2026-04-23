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
