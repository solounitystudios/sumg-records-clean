"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

const SECTIONS = ["hero", "artists", "releases", "brands", "producers"] as const

export async function updateHomepageConfig(formData: FormData) {
  await requireAdmin()

  const heroHeadline = formData.get("heroHeadline")?.toString().trim() ?? ""
  const heroSubtext  = formData.get("heroSubtext")?.toString().trim() ?? ""

  const featuredArtistSlugs  = formData.getAll("featuredArtistSlugs").map(String)
  const featuredBrandSlugs   = formData.getAll("featuredBrandSlugs").map(String)
  const featuredReleaseSlugs = formData.getAll("featuredReleaseSlugs").map(String)

  const showLatestReleases  = formData.get("showLatestReleases") === "on"
  const latestReleasesCount = Math.max(1, Math.min(12,
    parseInt(formData.get("latestReleasesCount")?.toString() ?? "4", 10) || 4
  ))

  const sectionVisibility = Object.fromEntries(
    SECTIONS.map((s) => [s, formData.get(`section_${s}`) === "on"])
  )

  const { error } = await supabase.from("homepage_config").upsert({
    id: "homepage",
    hero_headline: heroHeadline,
    hero_subtext: heroSubtext,
    featured_artist_slugs: featuredArtistSlugs,
    featured_brand_slugs: featuredBrandSlugs,
    featured_release_slugs: featuredReleaseSlugs,
    show_latest_releases: showLatestReleases,
    latest_releases_count: latestReleasesCount,
    section_visibility: sectionVisibility,
    updated_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)

  revalidatePath("/")
  revalidatePath("/admin/cms")
  redirect("/admin/cms")
}
