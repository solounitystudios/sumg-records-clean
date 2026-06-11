"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import { extractSpotifyAlbumId, getSpotifyAlbum } from "@/lib/spotify"

export async function updateRelease(slug: string, formData: FormData) {
  await requireAdmin()

  const status = formData.get("status")?.toString() ?? ""
  const releaseDate = formData.get("releaseDate")?.toString() ?? ""
  const accentColor = formData.get("accentColor")?.toString() ?? ""
  const spotifyUrl = formData.get("spotifyUrl")?.toString().trim() ?? ""
  const coverArtUrl = formData.get("coverArtUrl")?.toString().trim() ?? ""

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
    .update({
      status,
      release_date: releaseDate,
      accent_color: accentColor,
      dsp_links: dspLinks,
      cover_art_url: coverArtUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/releases")
  revalidatePath("/releases")
  revalidatePath(`/releases/${slug}`)
  revalidatePath("/songs")
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
    tracklist: [],
    description: "",
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/releases")
  redirect("/admin/releases")
}

// Archive / restore / delete require owner, co_owner, or admin — enforced by requireAdmin()

export async function archiveRelease(slug: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("releases")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("slug", slug)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/releases")
  revalidatePath(`/releases/${slug}`)
  redirect("/admin/releases")
}

export async function restoreRelease(slug: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("releases")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("slug", slug)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/releases")
  revalidatePath(`/releases/${slug}`)
  redirect("/admin/releases")
}

export async function deleteRelease(slug: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("releases")
    .delete()
    .eq("slug", slug)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/releases")
  redirect("/admin/releases")
}

export interface BackfillCoverArtResult {
  totalChecked: number
  updated: number
  skipped: number
  failed: number
  errors: { slug: string; message: string }[]
}

/**
 * Backfill missing release cover artwork from Spotify.
 *
 * For each release that has no cover_art_url, we extract the Spotify album ID
 * from dsp_links.spotify, fetch the album, and store album.images[0].url.
 * Existing cover_art_url values are never overwritten, and dsp_links is left
 * untouched. Failures are isolated per release so one bad row never aborts the
 * batch.
 *
 * TODO: Once Supabase Storage re-upload is implemented, download the Spotify
 * image and re-host it in our own bucket instead of storing the remote
 * Spotify CDN URL directly (CDN URLs can rotate/expire).
 *
 * Pass `slugs` to restrict the backfill to a specific set of releases (used by
 * the bulk-management panel). Omit it to scan the entire catalog.
 */
export async function backfillCoverArtFromSpotify(
  slugs?: string[]
): Promise<BackfillCoverArtResult> {
  await requireAdmin()

  const result: BackfillCoverArtResult = {
    totalChecked: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  const scopedSlugs = slugs?.map((s) => s.trim()).filter(Boolean)
  if (scopedSlugs && scopedSlugs.length === 0) return result

  let query = supabase.from("releases").select("id, slug, dsp_links, cover_art_url")
  if (scopedSlugs) query = query.in("slug", scopedSlugs)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as {
    id: string
    slug: string
    dsp_links: { spotify?: string } | null
    cover_art_url: string | null
  }[]

  for (const row of rows) {
    result.totalChecked++

    // Never overwrite an existing cover.
    if (row.cover_art_url && row.cover_art_url.trim() !== "") {
      result.skipped++
      continue
    }

    // Nothing to backfill from without a Spotify link.
    const spotifyUrl = row.dsp_links?.spotify ?? ""
    const albumId = spotifyUrl ? extractSpotifyAlbumId(spotifyUrl) : null
    if (!albumId) {
      result.skipped++
      continue
    }

    try {
      const album = await getSpotifyAlbum(albumId)
      const imageUrl = album?.images?.[0]?.url

      if (!album) {
        result.failed++
        result.errors.push({ slug: row.slug, message: "Spotify album fetch failed" })
        continue
      }
      if (!imageUrl) {
        result.failed++
        result.errors.push({ slug: row.slug, message: "Spotify album has no cover image" })
        continue
      }

      const { error: updateError } = await supabase
        .from("releases")
        .update({ cover_art_url: imageUrl, updated_at: new Date().toISOString() })
        .eq("id", row.id)

      if (updateError) {
        result.failed++
        result.errors.push({ slug: row.slug, message: updateError.message })
        continue
      }

      result.updated++
    } catch (err) {
      result.failed++
      result.errors.push({
        slug: row.slug,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (result.updated > 0) {
    revalidatePath("/admin/releases")
    revalidatePath("/releases")
    revalidatePath("/releases/[slug]", "page")
    revalidatePath("/songs")
  }

  return result
}
