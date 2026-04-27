"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export async function createBrand(formData: FormData) {
  await requireAdmin()

  const name = formData.get("name")?.toString().trim() ?? ""
  const slug = formData.get("slug")?.toString().trim() ?? ""
  const tagline = formData.get("tagline")?.toString().trim() ?? ""
  const descriptor = formData.get("descriptor")?.toString().trim() ?? ""
  const category = formData.get("category")?.toString().trim() ?? "Fashion"

  if (!name || !slug) throw new Error("Name and slug are required.")

  const { error } = await supabase.from("brands").insert({
    id: crypto.randomUUID(),
    slug,
    name,
    tagline: tagline || "",
    descriptor: descriptor || "",
    category: category || "Fashion",
    sort_order: 999,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/brands")
  revalidatePath("/brands")
  redirect("/admin/brands")
}

export async function updateBrand(slug: string, formData: FormData) {
  await requireAdmin()

  const name = formData.get("name")?.toString().trim() ?? ""
  const tagline = formData.get("tagline")?.toString().trim() ?? ""
  const descriptor = formData.get("descriptor")?.toString().trim() ?? ""
  const category = formData.get("category")?.toString().trim() ?? "Fashion"
  const manifesto = formData.get("manifesto")?.toString().trim() || null
  const collectionName = formData.get("collectionName")?.toString().trim() || null
  const campaignStatus = formData.get("campaignStatus")?.toString().trim() || null
  const shopifyUrl = formData.get("shopifyUrl")?.toString().trim() || null
  const logoUrl = formData.get("logoUrl")?.toString().trim() || null
  const heroImageUrl = formData.get("heroImageUrl")?.toString().trim() || null
  // Prefer the typed hex input; fall back to the color-picker value
  const accentColorRaw =
    formData.get("accentColorHex")?.toString().trim() ||
    formData.get("accentColor")?.toString().trim() ||
    null
  const accentColor = accentColorRaw && /^#[0-9a-fA-F]{6}$/.test(accentColorRaw)
    ? accentColorRaw
    : null
  const isActive = formData.get("isActive") === "on"

  if (!name) throw new Error("Name is required.")

  const { error } = await supabase
    .from("brands")
    .update({
      name,
      tagline,
      descriptor,
      category,
      manifesto,
      collection_name: collectionName,
      campaign_status: campaignStatus,
      shopify_url: shopifyUrl,
      logo_url: logoUrl,
      hero_image_url: heroImageUrl,
      accent_color: accentColor,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/brands")
  revalidatePath(`/brands/${slug}`)
  revalidatePath("/brands")
  redirect("/admin/brands")
}
