import { supabase } from "./supabase"
import type { RoyaltyRecord, PlatformRoyalty } from "@/lib/data"

const SELECT = "period, artist_slug, artist_name, streams, revenue, platforms"

type RoyaltyRow = {
  period: string
  artist_slug: string
  artist_name: string
  streams: number
  revenue: number
  platforms: PlatformRoyalty[] | null
}

function toRoyaltyRecord(row: RoyaltyRow): RoyaltyRecord {
  return {
    period: row.period,
    artistSlug: row.artist_slug,
    artistName: row.artist_name,
    streams: row.streams,
    revenue: row.revenue,
    platforms: row.platforms ?? [],
  }
}

export async function getRoyalties(): Promise<RoyaltyRecord[]> {
  const { data, error } = await supabase
    .from("royalties")
    .select(SELECT)
    .order("period", { ascending: false })
    .order("revenue", { ascending: false })
  if (error) throw new Error(`getRoyalties: ${error.message}`)
  return (data as RoyaltyRow[]).map(toRoyaltyRecord)
}
