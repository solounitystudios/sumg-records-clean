import { supabase } from "./supabase"
import type { Brand } from "@/lib/data"

const SELECT =
  "id, slug, name, tagline, descriptor, category, accent_color, logo_url, hero_image_url, shopify_url, is_active, campaign_status, collection_name, manifesto"

type BrandRow = {
  id: string
  slug: string
  name: string
  tagline: string
  descriptor: string
  category: string
  accent_color: string | null
  logo_url: string | null
  hero_image_url: string | null
  shopify_url: string | null
  is_active: boolean
  campaign_status: string | null
  collection_name: string | null
  manifesto: string | null
}

function toBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.descriptor,
    category: row.category,
    accentColor: row.accent_color,
    logoUrl: row.logo_url,
    heroImageUrl: row.hero_image_url,
    shopifyUrl: row.shopify_url,
    isActive: row.is_active,
    campaignStatus: row.campaign_status,
    collectionName: row.collection_name,
    manifesto: row.manifesto,
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
