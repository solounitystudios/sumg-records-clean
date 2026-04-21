import { MetadataRoute } from "next";
import { getAllArtists, getAllProducers, getAllBrands, getPublishedReleases } from "@/lib/cms";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://sumgrecords.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artists, producers, brands, releases] = await Promise.all([
    getAllArtists(),
    getAllProducers(),
    getAllBrands(),
    getPublishedReleases(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/artists`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/releases`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/producers`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/brands`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const artistRoutes: MetadataRoute.Sitemap = artists.map((a) => ({
    url: `${BASE_URL}/artists/${a.slug}`,
    lastModified: new Date(a.updatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const producerRoutes: MetadataRoute.Sitemap = producers.map((p) => ({
    url: `${BASE_URL}/producers/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const brandRoutes: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${BASE_URL}/brands/${b.slug}`,
    lastModified: new Date(b.updatedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const releaseRoutes: MetadataRoute.Sitemap = releases.map((r) => ({
    url: `${BASE_URL}/releases/${r.slug}`,
    lastModified: new Date(r.updatedAt),
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...artistRoutes,
    ...producerRoutes,
    ...brandRoutes,
    ...releaseRoutes,
  ];
}
