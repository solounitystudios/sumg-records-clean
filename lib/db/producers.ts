import { supabase } from "./supabase"
import type { Producer } from "@/lib/data"

const SELECT =
  "id, slug, name, specialties_list, credit_count, bio, status, image_url, banner_url, social_links, " +
  "yt_channel_url, yt_handle, yt_channel_id, yt_upload_cadence, " +
  "yt_title_template, yt_description_template, yt_default_tags, dna_slug"

type ProducerRow = Record<string, any>

function toProducer(row: ProducerRow): Producer {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    specialties: row.specialties_list ?? [],
    credits: row.credit_count,
    bio: row.bio ?? "",
    status: row.status ?? "active",
    imageUrl: row.image_url ?? null,
    bannerUrl: row.banner_url ?? null,
    socialLinks: row.social_links ?? null,
    ytChannelUrl: row.yt_channel_url ?? null,
    ytHandle: row.yt_handle ?? null,
    ytChannelId: row.yt_channel_id ?? null,
    ytUploadCadence: row.yt_upload_cadence ?? 3,
    ytTitleTemplate: row.yt_title_template ?? null,
    ytDescriptionTemplate: row.yt_description_template ?? null,
    ytDefaultTags: row.yt_default_tags ?? [],
    dnaSlug: row.dna_slug ?? null,
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

export async function getProducerBySlug(slug: string): Promise<Producer | undefined> {
  const { data, error } = await supabase
    .from("producers")
    .select(SELECT)
    .eq("slug", slug)
    .single()
  if (error) {
    if (error.code === "PGRST116") return undefined
    throw new Error(`getProducerBySlug: ${error.message}`)
  }
  return toProducer(data as ProducerRow)
}
