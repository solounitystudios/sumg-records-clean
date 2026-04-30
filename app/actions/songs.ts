"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export async function createSong(formData: FormData): Promise<void> {
  await requireAdmin()

  const title      = formData.get("title")?.toString().trim() ?? ""
  const artistSlug = formData.get("artist_slug")?.toString().trim() ?? ""
  const artistName = formData.get("artist_name")?.toString().trim() ?? ""

  if (!title || !artistSlug || !artistName) throw new Error("title, artist_slug, and artist_name are required")

  const slug = slugify(title) + "-" + Date.now().toString(36)

  const { error } = await supabase.from("songs").insert({
    slug,
    title,
    artist_slug:   artistSlug,
    artist_name:   artistName,
    release_slug:  formData.get("release_slug")?.toString().trim() || null,
    genre:         formData.get("genre")?.toString().trim()         || null,
    duration:      formData.get("duration")?.toString().trim()      || null,
    track_number:  formData.get("track_number") ? Number(formData.get("track_number")) : null,
    is_explicit:   formData.get("is_explicit") === "true",
    isrc:          formData.get("isrc")?.toString().trim()          || null,
    status:        formData.get("status")?.toString()               || "draft",
    is_visible:    false,
    created_at:    new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  })
  if (error) throw new Error(error.message)

  revalidatePath("/admin/songs")
  revalidatePath("/songs")
  redirect("/admin/songs")
}

export async function updateSong(id: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const { error } = await supabase
    .from("songs")
    .update({
      title:        formData.get("title")?.toString().trim()        || undefined,
      genre:        formData.get("genre")?.toString().trim()        || null,
      duration:     formData.get("duration")?.toString().trim()     || null,
      track_number: formData.get("track_number") ? Number(formData.get("track_number")) : null,
      is_explicit:  formData.get("is_explicit") === "true",
      isrc:         formData.get("isrc")?.toString().trim()         || null,
      status:       formData.get("status")?.toString()              || undefined,
      is_visible:   formData.get("is_visible") === "true",
      lyrics:       formData.get("lyrics")?.toString()              || null,
      updated_at:   new Date().toISOString(),
    })
    .eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/songs")
  revalidatePath("/songs")
  redirect("/admin/songs")
}

export async function archiveSong(id: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("songs")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/songs")
  revalidatePath("/songs")
  redirect("/admin/songs")
}

export async function restoreSong(id: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("songs")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/songs")
  revalidatePath("/songs")
  redirect("/admin/songs")
}

export async function deleteSong(id: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("songs")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/songs")
  revalidatePath("/songs")
  redirect("/admin/songs")
}
