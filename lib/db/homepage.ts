import { supabase } from "./supabase"
import type { CMSHomepageConfig } from "@/lib/types"

const FALLBACK: CMSHomepageConfig = {
  id: "homepage",
  heroHeadline: "Sound. Vision. Culture.",
  heroSubtext:
    "SUMG Records is an independent label building artists and sound worlds with precision.",
  featuredArtistSlugs: ["zyson", "lysandra-noir", "turkz", "marrick"],
  featuredBrandSlugs: ["woronoff", "unity-standard", "moon-spell"],
  featuredReleaseSlugs: ["afterglow", "veil", "monument"],
  showLatestReleases: true,
  latestReleasesCount: 4,
  sectionOrder: ["hero", "artists", "releases", "brands", "producers"],
  sectionVisibility: {
    hero: true,
    artists: true,
    releases: true,
    brands: true,
    producers: true,
  },
  updatedAt: new Date().toISOString(),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toConfig(r: any): CMSHomepageConfig {
  return {
    id: r.id,
    heroHeadline: r.hero_headline ?? FALLBACK.heroHeadline,
    heroSubtext: r.hero_subtext ?? FALLBACK.heroSubtext,
    featuredArtistSlugs: r.featured_artist_slugs ?? [],
    featuredBrandSlugs: r.featured_brand_slugs ?? [],
    featuredReleaseSlugs: r.featured_release_slugs ?? [],
    showLatestReleases: r.show_latest_releases ?? true,
    latestReleasesCount: r.latest_releases_count ?? 4,
    sectionOrder: r.section_order ?? FALLBACK.sectionOrder,
    sectionVisibility: r.section_visibility ?? FALLBACK.sectionVisibility,
    updatedAt: r.updated_at,
  }
}

export async function getHomepageConfig(): Promise<CMSHomepageConfig> {
  try {
    const { data, error } = await supabase
      .from("homepage_config")
      .select("*")
      .eq("id", "homepage")
      .single()
    if (error || !data) return FALLBACK
    return toConfig(data)
  } catch {
    return FALLBACK
  }
}
