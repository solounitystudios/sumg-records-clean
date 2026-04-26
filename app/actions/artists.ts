"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

const BUCKET = "sumg-assets"
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])
const MAX_BYTES = 10 * 1024 * 1024

export type PhotoUploadResult = { url: string } | { error: string }

export async function uploadArtistPhoto(
  formData: FormData,
  artistSlug: string,
): Promise<PhotoUploadResult> {
  await requireAdmin()

  const file = formData.get("file")
  if (!(file instanceof File)) return { error: "No file provided." }
  if (!ALLOWED_MIME.has(file.type)) return { error: "Only JPEG, PNG, or WebP images are accepted." }
  if (file.size === 0) return { error: "File is empty." }
  if (file.size > MAX_BYTES) return { error: "Image must be under 10 MB." }

  const id = crypto.randomUUID()
  const path = `artists/${id}.jpeg`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = urlData.publicUrl

  const { error: artistError } = await supabase
    .from("artists")
    .update({ profile_image_url: url, updated_at: new Date().toISOString() })
    .eq("slug", artistSlug)

  if (artistError) return { error: artistError.message }

  await supabase.from("assets").insert({
    type: "image",
    url,
    filename: `${id}.jpeg`,
    mime_type: file.type,
    size_bytes: file.size,
    attached_to: { type: "artist", slug: artistSlug },
    uploaded_by: "admin",
  })

  revalidatePath("/admin/artists")
  return { url }
}

export async function unlinkArtistSpotify(slug: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const { data: existing } = await supabase
    .from("artists")
    .select("social_links")
    .eq("slug", slug)
    .maybeSingle()

  const socialLinks = { ...(existing?.social_links ?? {}) }
  delete socialLinks.spotify

  const { error } = await supabase
    .from("artists")
    .update({
      spotify_id: null,
      social_links: socialLinks,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)

  if (error) return { ok: false, error: error.message }

  revalidatePath("/admin/artists")
  revalidatePath(`/artists/${slug}`)
  return { ok: true }
}

export async function updateArtist(slug: string, formData: FormData) {
  await requireAdmin()

  const name = formData.get("name")?.toString().trim() ?? ""
  const role = formData.get("role")?.toString().trim() ?? ""
  const genre = formData.get("genre")?.toString().trim() ?? ""
  const bio = formData.get("bio")?.toString().trim() ?? ""
  const tagsRaw = formData.get("tags")?.toString().trim() ?? ""
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
  const status = formData.get("status")?.toString() ?? "active"
  const featured = formData.get("featured") === "on"

  // Social links
  const instagram  = formData.get("instagram")?.toString().trim()  || null
  const twitter    = formData.get("twitter")?.toString().trim()    || null
  const youtube    = formData.get("youtube")?.toString().trim()    || null
  const tiktok     = formData.get("tiktok")?.toString().trim()     || null
  const soundcloud = formData.get("soundcloud")?.toString().trim() || null

  if (!name) throw new Error("Name is required.")

  // Preserve existing spotify link
  const { data: existing } = await supabase
    .from("artists")
    .select("social_links")
    .eq("slug", slug)
    .maybeSingle()

  const socialLinks = {
    ...(existing?.social_links ?? {}),
    ...(instagram  !== null ? { instagram }  : {}),
    ...(twitter    !== null ? { twitter }    : {}),
    ...(youtube    !== null ? { youtube }    : {}),
    ...(tiktok     !== null ? { tiktok }     : {}),
    ...(soundcloud !== null ? { soundcloud } : {}),
  }

  const { error } = await supabase
    .from("artists")
    .update({
      name,
      role,
      genre,
      bio,
      tags,
      status,
      featured,
      social_links: socialLinks,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/artists")
  revalidatePath(`/artists/${slug}`)
  redirect("/admin/artists")
}

export async function createArtist(formData: FormData) {
  await requireAdmin()

  const name = formData.get("name")?.toString().trim() ?? ""
  const role = formData.get("role")?.toString().trim() ?? ""
  const genre = formData.get("genre")?.toString().trim() ?? ""
  const bio = formData.get("bio")?.toString().trim() ?? ""
  const status = formData.get("status")?.toString() ?? "active"
  const featured = formData.get("featured") === "on"
  const tagsRaw = formData.get("tags")?.toString().trim() ?? ""
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)

  if (!name) throw new Error("Name is required.")

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()

  if (!slug) throw new Error("Could not generate a valid slug from name.")

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()

  if (existing) throw new Error(`An artist with slug "${slug}" already exists.`)

  const { error } = await supabase.from("artists").insert({
    slug,
    name,
    role,
    genre,
    bio,
    tags,
    status,
    featured,
    featured_on_homepage: false,
    release_count: 0,
    sort_order: 999,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/artists")
  redirect(`/admin/artists/${slug}/edit`)
}

export async function uploadArtistHeroImage(
  formData: FormData,
  artistSlug: string,
): Promise<PhotoUploadResult> {
  await requireAdmin()

  const file = formData.get("file")
  if (!(file instanceof File)) return { error: "No file provided." }
  if (!ALLOWED_MIME.has(file.type)) return { error: "Only JPEG, PNG, or WebP images are accepted." }
  if (file.size === 0) return { error: "File is empty." }
  if (file.size > MAX_BYTES) return { error: "Image must be under 10 MB." }

  const id = crypto.randomUUID()
  const path = `artists/hero/${id}.jpeg`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = urlData.publicUrl

  const { error: artistError } = await supabase
    .from("artists")
    .update({ hero_image_url: url, updated_at: new Date().toISOString() })
    .eq("slug", artistSlug)

  if (artistError) return { error: artistError.message }

  revalidatePath("/admin/artists")
  revalidatePath(`/artists/${artistSlug}`)
  return { url }
}

// Archive/restore require owner, co_owner, or admin — enforced by requireAdmin()

export async function archiveArtist(slug: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("artists")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("slug", slug)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/artists")
  revalidatePath(`/artists/${slug}`)
  redirect("/admin/artists")
}

export async function restoreArtist(slug: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("artists")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("slug", slug)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/artists")
  revalidatePath(`/artists/${slug}`)
  redirect("/admin/artists")
}
