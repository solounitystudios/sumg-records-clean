"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export async function updateRelease(slug: string, formData: FormData) {
  await requireAdmin()

  const status = formData.get("status")?.toString() ?? ""
  const releaseDate = formData.get("releaseDate")?.toString() ?? ""
  const accentColor = formData.get("accentColor")?.toString() ?? ""
  const spotifyUrl = formData.get("spotifyUrl")?.toString().trim() ?? ""

  // Fetch existing dsp_links to merge Spotify URL without clobbering other platforms
  const { data: existing } = await supabase
    .from("releases")
    .select("dsp_links")
    .eq("slug", slug)
    .maybeSingle()

  const dspLinks = { ...(existing?.dsp_links ?? {}) }
  if (spotifyUrl) {
    dspLinks.spotify = spotifyUrl
  } else {
    delete dspLinks.spotify
  }

  const { error } = await supabase
    .from("releases")
    .update({ status, release_date: releaseDate, accent_color: accentColor, dsp_links: dspLinks })
    .eq("slug", slug)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/releases")
  revalidatePath(`/releases/${slug}`)
  redirect("/admin/releases")
}

export async function createRelease(formData: FormData) {
  await requireAdmin()

  const title = formData.get("title")?.toString().trim() ?? ""
  const slug = formData.get("slug")?.toString().trim() ?? ""
  const artistSlug = formData.get("artistSlug")?.toString() ?? ""
  const type = formData.get("type")?.toString() ?? "single"
  const releaseDate = formData.get("releaseDate")?.toString() ?? ""
  const status = formData.get("status")?.toString() ?? "draft"
  const accentColor = formData.get("accentColor")?.toString() || "#6366f1"

  if (!title || !slug || !artistSlug || !releaseDate) {
    throw new Error("Title, slug, artist, and release date are required.")
  }

  const { data: artistRow } = await supabase
    .from("artists")
    .select("name")
    .eq("slug", artistSlug)
    .single()

  const { error } = await supabase.from("releases").insert({
    id: crypto.randomUUID(),
    slug,
    title,
    artist_slug: artistSlug,
    artist_name: artistRow?.name ?? artistSlug,
    type,
    release_date: releaseDate,
    status,
    accent_color: accentColor,
    streams: 0,
    platforms: [],
    tracklist: [],
    description: "",
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/releases")
  redirect("/admin/releases")
}
