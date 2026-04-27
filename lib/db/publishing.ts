import { supabase } from "./supabase"

export type PublishingWork = {
  id: string
  title: string
  artistSlug: string | null
  releaseSlug: string | null
  songId: string | null
  iswc: string
  writers: string[]
  publishers: string[]
  splits: Record<string, number>
  pro: string
  status: "unregistered" | "pending" | "registered"
  notes: string
  createdAt: string
  updatedAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toWork(row: Record<string, any>): PublishingWork {
  return {
    id: row.id,
    title: row.title,
    artistSlug: row.artist_slug ?? null,
    releaseSlug: row.release_slug ?? null,
    songId: row.song_id ?? null,
    iswc: row.iswc ?? "",
    writers: row.writers ?? [],
    publishers: row.publishers ?? [],
    splits: row.splits ?? {},
    pro: row.pro ?? "",
    status: row.status ?? "unregistered",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getPublishingWorks(): Promise<PublishingWork[]> {
  const { data, error } = await supabase
    .from("publishing_works")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`getPublishingWorks: ${error.message}`)
  return (data ?? []).map(toWork)
}

export async function getPublishingWorkById(id: string): Promise<PublishingWork | null> {
  const { data, error } = await supabase
    .from("publishing_works")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(`getPublishingWorkById: ${error.message}`)
  return data ? toWork(data) : null
}

export const PRO_OPTIONS = ["BMI", "Songtrust", "SoundExchange", "DistroKid", "ASCAP", "SESAC", "Other"] as const
