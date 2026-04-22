import { supabase } from "./supabase"
import type { Producer } from "@/lib/data"

const SELECT = "id, slug, name, specialties_list, credit_count, bio"

type ProducerRow = {
  id: string
  slug: string
  name: string
  specialties_list: string[] | null
  credit_count: number
  bio: string | null
}

function toProducer(row: ProducerRow): Producer {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    specialties: row.specialties_list ?? [],
    credits: row.credit_count,
    bio: row.bio ?? "",
  }
}

export async function getProducers(): Promise<Producer[]> {
  const { data, error } = await supabase
    .from("producers")
    .select(SELECT)
    .order("sort_order")
  if (error) throw new Error(`getProducers: ${error.message}`)
  return (data as ProducerRow[]).map(toProducer)
}
