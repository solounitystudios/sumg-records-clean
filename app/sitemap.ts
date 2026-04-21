import type { MetadataRoute } from "next";
import { getAllArtists, getPublishedReleases, getAllBrands } from "@/lib/cms";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sumgrecords.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artists, releases, brands] = await Promise.all([
    getAllArtists(),
    getPublishedReleases(),
    getAllBrands(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), priority: 1.0, changeFrequency: "weekly" },
    { url: `${BASE_URL}/artists`, lastModified: new Date(), priority: 0.9, changeFrequency: "weekly" },
    { url: `${BASE_URL}/releases`, lastModified: new Date(), priority: 0.9, changeFrequency: "weekly" },
    { url: `${BASE_URL}/brands`, lastModified: new Date(), priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE_URL}/about`, lastModified: new Date(), priority: 0.7, changeFrequency: "monthly" },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), priority: 0.6, changeFrequency: "yearly" },
  ];

  const artistRoutes: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: `${BASE_URL}/artists/${artist.slug}`,
    lastModified: new Date(),
    priority: 0.8,
    changeFrequency: "monthly" as const,
  }));

  const releaseRoutes: MetadataRoute.Sitemap = releases.map((release) => ({
    url: `${BASE_URL}/releases/${release.slug}`,
    lastModified: release.releaseDate ? new Date(release.releaseDate) : new Date(),
    priority: 0.7,
    changeFrequency: "yearly" as const,
  }));

  const brandRoutes: MetadataRoute.Sitemap = brands
    .filter((b) => b.isActive)
    .map((brand) => ({
      url: `${BASE_URL}/brands/${brand.slug}`,
      lastModified: new Date(),
      priority: 0.7,
      changeFrequency: "monthly" as const,
    }));

  return [...staticRoutes, ...artistRoutes, ...releaseRoutes, ...brandRoutes];
}
