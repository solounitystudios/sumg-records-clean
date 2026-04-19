import { CMSArtist, CMSBrand, CMSProducer, CMSRelease } from "@/lib/types";
import { artists as rawArtists } from "@/data/artists";
import { brands as rawBrands } from "@/data/brands";
import { producers as rawProducers } from "@/data/producers";
import { releases as rawReleases } from "@/data/releases";

// In Phase 3, replace these with actual DB queries (Supabase, Prisma, etc.)

export function getPublishedReleases(): CMSRelease[] {
  return rawReleases
    .filter((r) => r.status === "published" && r.isVisible)
    .filter((r) => {
      if (!r.publishAt) return true;
      return new Date(r.publishAt) <= new Date();
    });
}

export function getReleaseBySlug(slug: string): CMSRelease | undefined {
  return rawReleases.find((r) => r.slug === slug && r.status === "published" && r.isVisible);
}

export function getArtistBySlug(slug: string): CMSArtist | undefined {
  return rawArtists.find((a) => a.slug === slug) as CMSArtist | undefined;
}

export function getAllArtists(): CMSArtist[] {
  return rawArtists as CMSArtist[];
}

export function getBrandBySlug(slug: string): CMSBrand | undefined {
  return rawBrands.find((b) => b.slug === slug) as CMSBrand | undefined;
}

export function getAllBrands(): CMSBrand[] {
  return rawBrands as CMSBrand[];
}

export function getAllProducers(): CMSProducer[] {
  return rawProducers as CMSProducer[];
}

export function getProducerBySlug(slug: string): CMSProducer | undefined {
  return rawProducers.find((p) => p.slug === slug) as CMSProducer | undefined;
}

export function getArtistReleases(artistSlug: string): CMSRelease[] {
  return getPublishedReleases().filter((r) => r.artistSlug === artistSlug);
}
