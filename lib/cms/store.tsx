"use client";

/**
 * Supabase-backed CMS store.
 *
 * Design: optimistic-update pattern.
 *   • React state is updated synchronously (no consumer changes needed).
 *   • Every mutation also fires an async Supabase call in the background.
 *   • On mount the provider loads real data from Supabase if env vars are
 *     present; otherwise it falls back to the static seed files so the UI
 *     still works without a DB (local dev, Storybook, preview deploys, etc.).
 *
 * Public interface is identical to the previous in-memory version — all
 * consumer pages and components continue to work without modification.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { artists as seedArtists } from "@/data/artists";
import { producers as seedProducers } from "@/data/producers";
import { brands as seedBrands } from "@/data/brands";
import { releases as seedReleases } from "@/data/releases";
import {
  CMSArtist,
  CMSProducer,
  CMSBrand,
  CMSRelease,
  CMSAsset,
  CMSHomepageConfig,
  CMSSong,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

// ─── Helpers ────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

/** Returns true if a release should be visible on the public site. */
export function isReleasePublic(r: CMSRelease): boolean {
  if (!r.isVisible) return false;
  if (r.status !== "published") return false;
  if (r.publishAt && new Date(r.publishAt) > new Date()) return false;
  return true;
}

/** True when Supabase env vars are configured. */
function hasSupabase(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://") &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}

// ─── DB row → CMS type mappers ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToArtist(r: any): CMSArtist {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    role: r.role ?? "",
    genre: r.genre ?? "",
    bio: r.bio ?? "",
    longBio: r.long_bio ?? undefined,
    featured: r.featured ?? false,
    featuredOnHomepage: r.featured_on_homepage ?? false,
    tier: r.tier ?? "secondary",
    status: r.status ?? "active",
    sortOrder: r.sort_order ?? 0,
    heroImageUrl: r.hero_image_url ?? undefined,
    profileImageUrl: r.profile_image_url ?? undefined,
    socialLinks: r.social_links ?? undefined,
    associatedBrands: r.associated_brands ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProducer(r: any): CMSProducer {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    specialty: r.specialty ?? "",
    credits: r.credits ?? "",
    signature: r.signature ?? "",
    bio: r.bio ?? undefined,
    status: r.status ?? "active",
    sortOrder: r.sort_order ?? 0,
    featuredOnHomepage: r.featured_on_homepage ?? false,
    profileImageUrl: r.profile_image_url ?? undefined,
    heroImageUrl: r.hero_image_url ?? undefined,
    socialLinks: r.social_links ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBrand(r: any): CMSBrand {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category ?? "",
    descriptor: r.descriptor ?? "",
    tagline: r.tagline ?? "",
    manifesto: r.manifesto ?? undefined,
    heroCopy: r.hero_copy ?? undefined,
    longDescription: r.long_description ?? undefined,
    heroImageUrl: r.hero_image_url ?? undefined,
    logoUrl: r.logo_url ?? undefined,
    accentColor: r.accent_color ?? undefined,
    heroStyle: r.hero_style ?? undefined,
    isActive: r.is_active ?? true,
    featuredOnHomepage: r.featured_on_homepage ?? false,
    sortOrder: r.sort_order ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRelease(r: any): CMSRelease {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    artistSlug: r.artist_slug,
    artistName: r.artist_name,
    featuredArtistSlugs: r.featured_artist_slugs ?? undefined,
    producerSlugs: r.producer_slugs ?? undefined,
    type: r.type ?? "Single",
    genre: r.genre ?? "",
    releaseDate: r.release_date,
    publishAt: r.publish_at ?? undefined,
    status: r.status ?? "draft",
    isVisible: r.is_visible ?? false,
    featuredOnHomepage: r.featured_on_homepage ?? false,
    description: r.description ?? "",
    coverArtUrl: r.cover_art_url ?? undefined,
    tracklist: r.tracklist ?? undefined,
    streamingLinks: r.streaming_links ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAsset(r: any): CMSAsset {
  return {
    id: r.id,
    type: r.type,
    url: r.url,
    filename: r.filename,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes ?? undefined,
    altText: r.alt_text ?? undefined,
    attachedTo: r.attached_to ?? undefined,
    uploadedBy: r.uploaded_by ?? undefined,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToHomepageConfig(r: any): CMSHomepageConfig {
  return {
    id: r.id,
    featuredArtistSlugs: r.featured_artist_slugs ?? [],
    featuredBrandSlugs: r.featured_brand_slugs ?? [],
    featuredReleaseSlugs: r.featured_release_slugs ?? [],
    heroHeadline: r.hero_headline ?? "",
    heroSubtext: r.hero_subtext ?? "",
    showLatestReleases: r.show_latest_releases ?? true,
    latestReleasesCount: r.latest_releases_count ?? 4,
    sectionOrder: r.section_order ?? undefined,
    sectionVisibility: r.section_visibility ?? undefined,
    updatedAt: r.updated_at,
  };
}

// ─── Default homepage config (seed fallback) ─────────────────────────────────

const defaultHomepageConfig: CMSHomepageConfig = {
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
  updatedAt: now(),
};

// ─── Store types ─────────────────────────────────────────────────────────────

export interface AdminNotification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface CmsStoreState {
  artists: CMSArtist[];
  producers: CMSProducer[];
  brands: CMSBrand[];
  releases: CMSRelease[];
  assets: CMSAsset[];
  homepageConfig: CMSHomepageConfig;
  notifications: AdminNotification[];
  /** True while the initial Supabase data load is in flight. */
  isLoading: boolean;
}

interface CmsStoreActions {
  // Artists
  getArtistById: (id: string) => CMSArtist | undefined;
  getArtistBySlug: (slug: string) => CMSArtist | undefined;
  createArtist: (data: Omit<CMSArtist, "id" | "createdAt" | "updatedAt">) => CMSArtist;
  updateArtist: (id: string, data: Partial<CMSArtist>) => CMSArtist | undefined;
  deleteArtist: (id: string) => void;

  // Producers
  getProducerById: (id: string) => CMSProducer | undefined;
  getProducerBySlug: (slug: string) => CMSProducer | undefined;
  createProducer: (data: Omit<CMSProducer, "id" | "createdAt" | "updatedAt">) => CMSProducer;
  updateProducer: (id: string, data: Partial<CMSProducer>) => CMSProducer | undefined;
  deleteProducer: (id: string) => void;

  // Brands
  getBrandById: (id: string) => CMSBrand | undefined;
  getBrandBySlug: (slug: string) => CMSBrand | undefined;
  createBrand: (data: Omit<CMSBrand, "id" | "createdAt" | "updatedAt">) => CMSBrand;
  updateBrand: (id: string, data: Partial<CMSBrand>) => CMSBrand | undefined;
  deleteBrand: (id: string) => void;

  // Releases
  getReleaseById: (id: string) => CMSRelease | undefined;
  getReleaseBySlug: (slug: string) => CMSRelease | undefined;
  getPublicReleases: () => CMSRelease[];
  createRelease: (data: Omit<CMSRelease, "id" | "createdAt" | "updatedAt">) => CMSRelease;
  updateRelease: (id: string, data: Partial<CMSRelease>) => CMSRelease | undefined;
  publishRelease: (id: string) => CMSRelease | undefined;
  deleteRelease: (id: string) => void;
  updateTracklist: (releaseId: string, tracklist: CMSSong[]) => void;

  // Assets
  getAssetById: (id: string) => CMSAsset | undefined;
  addAsset: (asset: Omit<CMSAsset, "id" | "createdAt">) => CMSAsset;
  updateAsset: (id: string, data: Partial<CMSAsset>) => CMSAsset | undefined;
  deleteAsset: (id: string) => void;

  // Homepage
  updateHomepageConfig: (data: Partial<CMSHomepageConfig>) => void;

  // Notifications
  notify: (type: AdminNotification["type"], message: string) => void;
  dismissNotification: (id: string) => void;
}

export type CmsStore = CmsStoreState & CmsStoreActions;

// ─── Context ─────────────────────────────────────────────────────────────────

const CmsStoreContext = createContext<CmsStore | null>(null);

export function useCmsStore(): CmsStore {
  const ctx = useContext(CmsStoreContext);
  if (!ctx) throw new Error("useCmsStore must be used inside <CmsStoreProvider>");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CmsStoreProvider({ children }: { children: ReactNode }) {
  // ── Initial state: seed data (replaced on mount if Supabase is configured) ──
  const [artists, setArtists] = useState<CMSArtist[]>(
    () => seedArtists as CMSArtist[]
  );
  const [producers, setProducers] = useState<CMSProducer[]>(
    () => seedProducers as CMSProducer[]
  );
  const [brands, setBrands] = useState<CMSBrand[]>(
    () => seedBrands as CMSBrand[]
  );
  const [releases, setReleases] = useState<CMSRelease[]>(
    () => seedReleases as CMSRelease[]
  );
  const [assets, setAssets] = useState<CMSAsset[]>([]);
  const [homepageConfig, setHomepageConfig] = useState<CMSHomepageConfig>(
    defaultHomepageConfig
  );
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const notify = useCallback(
    (type: AdminNotification["type"], message: string) => {
      const id = generateId();
      setNotifications((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4000);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Initial data load from Supabase ───────────────────────────────────────

  useEffect(() => {
    if (!hasSupabase()) return;
    const sb = createClient();
    setIsLoading(true);

    Promise.all([
      sb.from("artists").select("*").order("sort_order", { ascending: true }),
      sb.from("producers").select("*").order("sort_order", { ascending: true }),
      sb.from("brands").select("*").order("sort_order", { ascending: true }),
      sb.from("releases").select("*").order("release_date", { ascending: false }),
      sb.from("assets").select("*").order("created_at", { ascending: false }),
      sb.from("homepage_config").select("*").eq("id", "homepage").single(),
    ])
      .then(([a, p, b, r, as, hp]) => {
        if (a.data) setArtists(a.data.map(rowToArtist));
        if (p.data) setProducers(p.data.map(rowToProducer));
        if (b.data) setBrands(b.data.map(rowToBrand));
        if (r.data) setReleases(r.data.map(rowToRelease));
        if (as.data) setAssets(as.data.map(rowToAsset));
        if (hp.data) setHomepageConfig(rowToHomepageConfig(hp.data));
        if (a.error) console.error("[CMS] artists load:", a.error.message);
        if (p.error) console.error("[CMS] producers load:", p.error.message);
        if (b.error) console.error("[CMS] brands load:", b.error.message);
        if (r.error) console.error("[CMS] releases load:", r.error.message);
        if (as.error) console.error("[CMS] assets load:", as.error.message);
      })
      .catch((err) => console.error("[CMS] initial load failed:", err))
      .finally(() => setIsLoading(false));
  }, []); // run once on mount

  // ── Supabase background sync helper ──────────────────────────────────────

  function bgSync(dbOperation: (sb: ReturnType<typeof createClient>) => PromiseLike<{ error: { message: string } | null }>) {
    if (!hasSupabase()) return;
    const sb = createClient();
    Promise.resolve(dbOperation(sb)).then(({ error }) => {
      if (error) {
        console.error("[CMS] sync error:", error.message);
        notify("error", `Sync error: ${error.message}`);
      }
    });
  }

  // ── Artists ────────────────────────────────────────────────────────────────

  const getArtistById = useCallback(
    (id: string) => artists.find((a) => a.id === id),
    [artists]
  );

  const getArtistBySlug = useCallback(
    (slug: string) => artists.find((a) => a.slug === slug),
    [artists]
  );

  const createArtist = useCallback(
    (data: Omit<CMSArtist, "id" | "createdAt" | "updatedAt">): CMSArtist => {
      const artist: CMSArtist = {
        ...data,
        id: data.slug || generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setArtists((prev) => [...prev, artist]);
      bgSync((sb) =>
        sb.from("artists").insert({
          id: artist.id,
          slug: artist.slug,
          name: artist.name,
          role: artist.role,
          genre: artist.genre,
          bio: artist.bio,
          long_bio: artist.longBio ?? null,
          featured: artist.featured,
          featured_on_homepage: artist.featuredOnHomepage ?? false,
          tier: artist.tier,
          status: artist.status ?? "active",
          sort_order: artist.sortOrder ?? 0,
          hero_image_url: artist.heroImageUrl ?? null,
          profile_image_url: artist.profileImageUrl ?? null,
          social_links: artist.socialLinks ?? null,
          associated_brands: artist.associatedBrands ?? null,
        })
      );
      return artist;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateArtist = useCallback(
    (id: string, data: Partial<CMSArtist>): CMSArtist | undefined => {
      let updated: CMSArtist | undefined;
      setArtists((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          updated = { ...a, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        bgSync((sb) =>
          sb.from("artists").update({
            name: u.name,
            role: u.role,
            genre: u.genre,
            bio: u.bio,
            long_bio: u.longBio ?? null,
            featured: u.featured,
            featured_on_homepage: u.featuredOnHomepage ?? false,
            tier: u.tier,
            status: u.status ?? "active",
            sort_order: u.sortOrder ?? 0,
            hero_image_url: u.heroImageUrl ?? null,
            profile_image_url: u.profileImageUrl ?? null,
            social_links: u.socialLinks ?? null,
            associated_brands: u.associatedBrands ?? null,
            updated_at: u.updatedAt,
          }).eq("id", id)
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteArtist = useCallback((id: string) => {
    setArtists((prev) => prev.filter((a) => a.id !== id));
    bgSync((sb) => sb.from("artists").delete().eq("id", id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Producers ──────────────────────────────────────────────────────────────

  const getProducerById = useCallback(
    (id: string) => producers.find((p) => p.id === id),
    [producers]
  );

  const getProducerBySlug = useCallback(
    (slug: string) => producers.find((p) => p.slug === slug),
    [producers]
  );

  const createProducer = useCallback(
    (data: Omit<CMSProducer, "id" | "createdAt" | "updatedAt">): CMSProducer => {
      const producer: CMSProducer = {
        ...data,
        id: data.slug || generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setProducers((prev) => [...prev, producer]);
      bgSync((sb) =>
        sb.from("producers").insert({
          id: producer.id,
          slug: producer.slug,
          name: producer.name,
          specialty: producer.specialty,
          credits: producer.credits,
          signature: producer.signature,
          bio: producer.bio ?? null,
          status: producer.status ?? "active",
          sort_order: producer.sortOrder ?? 0,
          featured_on_homepage: producer.featuredOnHomepage ?? false,
          profile_image_url: producer.profileImageUrl ?? null,
          hero_image_url: producer.heroImageUrl ?? null,
          social_links: producer.socialLinks ?? null,
        })
      );
      return producer;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateProducer = useCallback(
    (id: string, data: Partial<CMSProducer>): CMSProducer | undefined => {
      let updated: CMSProducer | undefined;
      setProducers((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          updated = { ...p, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        bgSync((sb) =>
          sb.from("producers").update({
            name: u.name,
            specialty: u.specialty,
            credits: u.credits,
            signature: u.signature,
            bio: u.bio ?? null,
            status: u.status ?? "active",
            sort_order: u.sortOrder ?? 0,
            featured_on_homepage: u.featuredOnHomepage ?? false,
            profile_image_url: u.profileImageUrl ?? null,
            hero_image_url: u.heroImageUrl ?? null,
            social_links: u.socialLinks ?? null,
            updated_at: u.updatedAt,
          }).eq("id", id)
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteProducer = useCallback((id: string) => {
    setProducers((prev) => prev.filter((p) => p.id !== id));
    bgSync((sb) => sb.from("producers").delete().eq("id", id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Brands ─────────────────────────────────────────────────────────────────

  const getBrandById = useCallback(
    (id: string) => brands.find((b) => b.id === id),
    [brands]
  );

  const getBrandBySlug = useCallback(
    (slug: string) => brands.find((b) => b.slug === slug),
    [brands]
  );

  const createBrand = useCallback(
    (data: Omit<CMSBrand, "id" | "createdAt" | "updatedAt">): CMSBrand => {
      const brand: CMSBrand = {
        ...data,
        id: data.slug || generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setBrands((prev) => [...prev, brand]);
      bgSync((sb) =>
        sb.from("brands").insert({
          id: brand.id,
          slug: brand.slug,
          name: brand.name,
          category: brand.category,
          descriptor: brand.descriptor,
          tagline: brand.tagline,
          manifesto: brand.manifesto ?? null,
          hero_copy: brand.heroCopy ?? null,
          long_description: brand.longDescription ?? null,
          hero_image_url: brand.heroImageUrl ?? null,
          logo_url: brand.logoUrl ?? null,
          accent_color: brand.accentColor ?? null,
          hero_style: brand.heroStyle ?? null,
          is_active: brand.isActive,
          featured_on_homepage: brand.featuredOnHomepage ?? false,
          sort_order: brand.sortOrder ?? 0,
        })
      );
      return brand;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateBrand = useCallback(
    (id: string, data: Partial<CMSBrand>): CMSBrand | undefined => {
      let updated: CMSBrand | undefined;
      setBrands((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          updated = { ...b, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        bgSync((sb) =>
          sb.from("brands").update({
            name: u.name,
            category: u.category,
            descriptor: u.descriptor,
            tagline: u.tagline,
            manifesto: u.manifesto ?? null,
            hero_copy: u.heroCopy ?? null,
            long_description: u.longDescription ?? null,
            hero_image_url: u.heroImageUrl ?? null,
            logo_url: u.logoUrl ?? null,
            accent_color: u.accentColor ?? null,
            hero_style: u.heroStyle ?? null,
            is_active: u.isActive,
            featured_on_homepage: u.featuredOnHomepage ?? false,
            sort_order: u.sortOrder ?? 0,
            updated_at: u.updatedAt,
          }).eq("id", id)
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteBrand = useCallback((id: string) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
    bgSync((sb) => sb.from("brands").delete().eq("id", id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Releases ───────────────────────────────────────────────────────────────

  const getReleaseById = useCallback(
    (id: string) => releases.find((r) => r.id === id),
    [releases]
  );

  const getReleaseBySlug = useCallback(
    (slug: string) => releases.find((r) => r.slug === slug),
    [releases]
  );

  const getPublicReleases = useCallback(
    () => releases.filter(isReleasePublic),
    [releases]
  );

  const createRelease = useCallback(
    (data: Omit<CMSRelease, "id" | "createdAt" | "updatedAt">): CMSRelease => {
      const release: CMSRelease = {
        ...data,
        id: data.slug || generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setReleases((prev) => [...prev, release]);
      bgSync((sb) =>
        sb.from("releases").insert({
          id: release.id,
          slug: release.slug,
          title: release.title,
          artist_slug: release.artistSlug,
          artist_name: release.artistName,
          featured_artist_slugs: release.featuredArtistSlugs ?? null,
          producer_slugs: release.producerSlugs ?? null,
          type: release.type,
          genre: release.genre,
          release_date: release.releaseDate,
          publish_at: release.publishAt ?? null,
          status: release.status,
          is_visible: release.isVisible,
          featured_on_homepage: release.featuredOnHomepage ?? false,
          description: release.description,
          cover_art_url: release.coverArtUrl ?? null,
          tracklist: release.tracklist ?? null,
          streaming_links: release.streamingLinks ?? null,
        })
      );
      return release;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateRelease = useCallback(
    (id: string, data: Partial<CMSRelease>): CMSRelease | undefined => {
      let updated: CMSRelease | undefined;
      setReleases((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          updated = { ...r, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        bgSync((sb) =>
          sb.from("releases").update({
            title: u.title,
            artist_slug: u.artistSlug,
            artist_name: u.artistName,
            featured_artist_slugs: u.featuredArtistSlugs ?? null,
            producer_slugs: u.producerSlugs ?? null,
            type: u.type,
            genre: u.genre,
            release_date: u.releaseDate,
            publish_at: u.publishAt ?? null,
            status: u.status,
            is_visible: u.isVisible,
            featured_on_homepage: u.featuredOnHomepage ?? false,
            description: u.description,
            cover_art_url: u.coverArtUrl ?? null,
            tracklist: u.tracklist ?? null,
            streaming_links: u.streamingLinks ?? null,
            updated_at: u.updatedAt,
          }).eq("id", id)
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * publishRelease — transitions to "published" + isVisible = true.
   * Writes atomically to Supabase so the change immediately affects all
   * public pages that query releases with status = published.
   */
  const publishRelease = useCallback(
    (id: string): CMSRelease | undefined => {
      return updateRelease(id, {
        status: "published",
        isVisible: true,
        publishAt: now(),
      });
    },
    [updateRelease]
  );

  const deleteRelease = useCallback((id: string) => {
    setReleases((prev) => prev.filter((r) => r.id !== id));
    bgSync((sb) => sb.from("releases").delete().eq("id", id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTracklist = useCallback(
    (releaseId: string, tracklist: CMSSong[]) => {
      setReleases((prev) =>
        prev.map((r) =>
          r.id === releaseId ? { ...r, tracklist, updatedAt: now() } : r
        )
      );
      bgSync((sb) =>
        sb.from("releases").update({
          tracklist,
          updated_at: now(),
        }).eq("id", releaseId)
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Assets ─────────────────────────────────────────────────────────────────

  const getAssetById = useCallback(
    (id: string) => assets.find((a) => a.id === id),
    [assets]
  );

  const addAsset = useCallback(
    (data: Omit<CMSAsset, "id" | "createdAt">): CMSAsset => {
      const asset: CMSAsset = { ...data, id: generateId(), createdAt: now() };
      setAssets((prev) => [...prev, asset]);
      bgSync((sb) =>
        sb.from("assets").insert({
          id: asset.id,
          type: asset.type,
          url: asset.url,
          filename: asset.filename,
          mime_type: asset.mimeType,
          size_bytes: asset.sizeBytes ?? null,
          alt_text: asset.altText ?? null,
          attached_to: asset.attachedTo ?? null,
          uploaded_by: asset.uploadedBy ?? null,
        })
      );
      return asset;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateAsset = useCallback(
    (id: string, data: Partial<CMSAsset>): CMSAsset | undefined => {
      let updated: CMSAsset | undefined;
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          updated = { ...a, ...data };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        bgSync((sb) =>
          sb.from("assets").update({
            alt_text: u.altText ?? null,
            attached_to: u.attachedTo ?? null,
          }).eq("id", id)
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    bgSync((sb) => sb.from("assets").delete().eq("id", id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Homepage ───────────────────────────────────────────────────────────────

  const updateHomepageConfig = useCallback(
    (data: Partial<CMSHomepageConfig>) => {
      setHomepageConfig((prev) => {
        const updated = { ...prev, ...data, updatedAt: now() };
        bgSync((sb) =>
          sb.from("homepage_config").upsert({
            id: "homepage",
            featured_artist_slugs: updated.featuredArtistSlugs,
            featured_brand_slugs: updated.featuredBrandSlugs ?? [],
            featured_release_slugs: updated.featuredReleaseSlugs ?? [],
            hero_headline: updated.heroHeadline,
            hero_subtext: updated.heroSubtext,
            show_latest_releases: updated.showLatestReleases,
            latest_releases_count: updated.latestReleasesCount,
            section_order: updated.sectionOrder ?? null,
            section_visibility: updated.sectionVisibility ?? null,
            updated_at: updated.updatedAt,
          })
        );
        return updated;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const store: CmsStore = {
    artists,
    producers,
    brands,
    releases,
    assets,
    homepageConfig,
    notifications,
    isLoading,
    getArtistById,
    getArtistBySlug,
    createArtist,
    updateArtist,
    deleteArtist,
    getProducerById,
    getProducerBySlug,
    createProducer,
    updateProducer,
    deleteProducer,
    getBrandById,
    getBrandBySlug,
    createBrand,
    updateBrand,
    deleteBrand,
    getReleaseById,
    getReleaseBySlug,
    getPublicReleases,
    createRelease,
    updateRelease,
    publishRelease,
    deleteRelease,
    updateTracklist,
    getAssetById,
    addAsset,
    updateAsset,
    deleteAsset,
    updateHomepageConfig,
    notify,
    dismissNotification,
  };

  return (
    <CmsStoreContext.Provider value={store}>
      {children}
    </CmsStoreContext.Provider>
  );
}
