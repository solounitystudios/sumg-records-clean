"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

function parseSpecialties(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function parseTags(raw: string): string[] {
  return raw.split("\n").map((s) => s.trim()).filter(Boolean)
}

function num(v: string | null | undefined, fallback = 0): number {
  const n = parseInt(v ?? "", 10)
  return isNaN(n) ? fallback : n
}

export async function createProducer(formData: FormData) {
  await requireAdmin()

  const name   = formData.get("name")?.toString().trim() ?? ""
  const slug   = formData.get("slug")?.toString().trim() ?? ""
  const bio    = formData.get("bio")?.toString().trim() ?? ""
  const status = formData.get("status")?.toString() ?? "active"

  if (!name || !slug) throw new Error("Name and slug are required.")

  const socialLinks: Record<string, string> = {}
  for (const key of ["youtube", "instagram", "twitter", "soundcloud", "tiktok"]) {
    const v = formData.get(`social_${key}`)?.toString().trim()
    if (v) socialLinks[key] = v
  }

  const { error } = await supabase.from("producers").insert({
    id: crypto.randomUUID(),
    slug,
    name,
    bio: bio || null,
    status,
    specialties_list: parseSpecialties(formData.get("specialties")?.toString() ?? ""),
    credit_count: num(formData.get("creditCount")?.toString()),
    sort_order: 999,
    image_url: formData.get("image_url")?.toString().trim() || null,
    banner_url: formData.get("banner_url")?.toString().trim() || null,
    social_links: Object.keys(socialLinks).length ? socialLinks : null,
    yt_channel_url: formData.get("yt_channel_url")?.toString().trim() || null,
    yt_handle: formData.get("yt_handle")?.toString().trim() || null,
    yt_channel_id: formData.get("yt_channel_id")?.toString().trim() || null,
    yt_upload_cadence: num(formData.get("yt_upload_cadence")?.toString(), 3),
    yt_title_template: formData.get("yt_title_template")?.toString().trim() || null,
    yt_description_template: formData.get("yt_description_template")?.toString().trim() || null,
    yt_default_tags: parseTags(formData.get("yt_default_tags")?.toString() ?? ""),
    dna_slug: formData.get("dna_slug")?.toString().trim() || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/producers")
  revalidatePath("/producers")
  redirect("/admin/producers")
}

export async function updateProducer(slug: string, formData: FormData) {
  await requireAdmin()

  const name   = formData.get("name")?.toString().trim() ?? ""
  const bio    = formData.get("bio")?.toString().trim() ?? ""
  const status = formData.get("status")?.toString() ?? "active"

  const socialLinks: Record<string, string> = {}
  for (const key of ["youtube", "instagram", "twitter", "soundcloud", "tiktok"]) {
    const v = formData.get(`social_${key}`)?.toString().trim()
    if (v) socialLinks[key] = v
  }

  const { error } = await supabase
    .from("producers")
    .update({
      name,
      bio: bio || null,
      status,
      specialties_list: parseSpecialties(formData.get("specialties")?.toString() ?? ""),
      credit_count: num(formData.get("creditCount")?.toString()),
      image_url: formData.get("image_url")?.toString().trim() || null,
      banner_url: formData.get("banner_url")?.toString().trim() || null,
      social_links: Object.keys(socialLinks).length ? socialLinks : null,
      yt_channel_url: formData.get("yt_channel_url")?.toString().trim() || null,
      yt_handle: formData.get("yt_handle")?.toString().trim() || null,
      yt_channel_id: formData.get("yt_channel_id")?.toString().trim() || null,
      yt_upload_cadence: num(formData.get("yt_upload_cadence")?.toString(), 3),
      yt_title_template: formData.get("yt_title_template")?.toString().trim() || null,
      yt_description_template: formData.get("yt_description_template")?.toString().trim() || null,
      yt_default_tags: parseTags(formData.get("yt_default_tags")?.toString() ?? ""),
      dna_slug: formData.get("dna_slug")?.toString().trim() || null,
    })
    .eq("slug", slug)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/producers")
  revalidatePath(`/producers/${slug}`)
  redirect(`/admin/producers/${slug}/edit`)
}

export async function assignAsset(formData: FormData) {
  await requireAdmin()

  const producerSlug = formData.get("producer_slug")?.toString() ?? ""
  const assetId      = formData.get("asset_id")?.toString() ?? ""
  const notes        = formData.get("notes")?.toString().trim() || null

  if (!producerSlug || !assetId) throw new Error("producer_slug and asset_id are required.")

  const { error } = await supabase.from("producer_assets").insert({
    producer_slug: producerSlug,
    asset_id: assetId,
    status: "raw",
    notes,
  })

  if (error && error.code !== "23505") throw new Error(error.message) // ignore duplicate
  revalidatePath(`/admin/producers/${producerSlug}/assets`)
}

export async function updateAssetStatus(formData: FormData) {
  await requireAdmin()

  const id           = formData.get("id")?.toString() ?? ""
  const status       = formData.get("status")?.toString() ?? "raw"
  const producerSlug = formData.get("producer_slug")?.toString() ?? ""

  const { error } = await supabase
    .from("producer_assets")
    .update({ status })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/producers/${producerSlug}/assets`)
}

export async function unassignAsset(formData: FormData) {
  await requireAdmin()

  const id           = formData.get("id")?.toString() ?? ""
  const producerSlug = formData.get("producer_slug")?.toString() ?? ""

  const { error } = await supabase.from("producer_assets").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/producers/${producerSlug}/assets`)
}
