import { supabase } from "./supabase"
import type { Brand } from "@/lib/data"

const SELECT = "id, slug, name, tagline, descriptor, category"

type BrandRow = {
  id: string
  slug: string
  name: string
  tagline: string
  descriptor: string
  category: string
}

function toBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.descriptor,
    category: row.category,
  }
}

export async function getBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select(SELECT)
    .order("sort_order")
  if (error) throw new Error(`getBrands: ${error.message}`)
  return (data as BrandRow[]).map(toBrand)
}

export async function getBrandBySlug(slug: string): Promise<Brand | undefined> {
  const { data, error } = await supabase
    .from("brands")
    .select(SELECT)
    .eq("slug", slug)
    .single()
  if (error) {
    if (error.code === "PGRST116") return undefined
    throw new Error(`getBrandBySlug: ${error.message}`)
  }
  return toBrand(data as BrandRow)
}
