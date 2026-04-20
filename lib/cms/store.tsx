"use client";

/**
 * Supabase-backed CMS store.
 *
 * Design: optimistic-update pattern with rollback.
 *   • React state is updated synchronously (no consumer changes needed).
 *   • Every mutation fires an async Supabase call via bgSync().
 *   • On failure the optional rollback fn is called to revert state + a toast
 *     is shown, ensuring UI and DB remain consistent.
 *   • On mount the provider loads real data from Supabase when env vars are
 *     present; otherwise it falls back to static seed files (local dev /
 *     preview deploys without a DB).
 *
 * Public interface is identical to the previous in-memory version.
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
import { songs as seedSongs } from "@/data/songs";
import {
  CMSArtist,
  CMSProducer,
  CMSBrand,
  CMSRelease,
  CMSAsset,
  CMSHomepageConfig,
  CMSSong,
  AssetAttachment,
  ArtistTimelineItem,
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

const VALID_CAMPAIGN_STATUSES = new Set<string>(["active", "inactive", "upcoming"]);

/** Coerces a raw value to a valid CMSBrand campaignStatus or null. */
function sanitizeCampaignStatus(
  v: string | undefined | null
): "active" | "inactive" | "upcoming" | null {
  if (v && VALID_CAMPAIGN_STATUSES.has(v))
    return v as "active" | "inactive" | "upcoming";
  return null;
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
    providerConfig: r.provider_config ?? undefined,
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
    heroHeadline: r.hero_headline ?? undefined,
    heroSubcopy: r.hero_subcopy ?? undefined,
    longDescription: r.long_description ?? undefined,
    heroImageUrl: r.hero_image_url ?? undefined,
    logoUrl: r.logo_url ?? undefined,
    accentColor: r.accent_color ?? undefined,
    heroStyle: r.hero_style ?? undefined,
    campaignStatus: r.campaign_status ?? undefined,
    collectionName: r.collection_name ?? undefined,
    featuredReleaseSlugs: r.featured_release_slugs ?? undefined,

    featuredAssetIds: r.featured_asset_ids ?? undefined,
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
    dspLinks: r.dsp_links ?? undefined,
    providerConfig: r.provider_config ?? undefined,
    rightsMetadata: r.rights_metadata ?? undefined,
    distributionRecord: r.distribution_record ?? undefined,
    dataSource: r.data_source ?? undefined,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSong(r: any): CMSSong {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    artistSlug: r.artist_slug,
    artistName: r.artist_name,
    releaseSlug: r.release_slug ?? undefined,
    releaseName: r.release_name ?? undefined,
    producerSlugs: r.producer_slugs ?? undefined,
    genre: r.genre ?? undefined,
    duration: r.duration ?? undefined,
    audioUrl: r.audio_url ?? undefined,
    lyrics: r.lyrics ?? undefined,
    isExplicit: r.is_explicit ?? false,
    trackNumber: r.track_number ?? undefined,
    status: r.status ?? "draft",
    isVisible: r.is_visible ?? false,
    publishAt: r.publish_at ?? undefined,
    featuredOnHomepage: r.featured_on_homepage ?? false,
    mediaAssetId: r.media_asset_id ?? undefined,
    dspLinks: r.dsp_links ?? undefined,
    isrc: r.isrc ?? undefined,
    rightsMetadata: r.rights_metadata ?? undefined,
    dataSource: r.data_source ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTimelineItem(r: any): ArtistTimelineItem {
  return {
    id: r.id,
    artistSlug: r.artist_slug,
    type: r.type,
    title: r.title,
    description: r.description ?? undefined,
    eventDate: r.event_date,
    endDate: r.end_date ?? undefined,
    status: r.status ?? "draft",
    visibility: r.visibility ?? "private",
    linkedReleaseSlug: r.linked_release_slug ?? undefined,
    linkedSongSlug: r.linked_song_slug ?? undefined,
    linkedAssetIds: r.linked_asset_ids ?? undefined,
    tags: r.tags ?? undefined,
    importance: r.importance ?? 5,
    lyricEngineEligible: r.lyric_engine_eligible ?? false,
    createdAt: r.created_at,
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

/** Visible sync status for the UI indicator. */
export type SyncState = "idle" | "syncing" | "error";

/** Where the currently-displayed data originated from. */
export type DataSource = "db" | "seed";

interface CmsStoreState {
  artists: CMSArtist[];
  producers: CMSProducer[];
  brands: CMSBrand[];
  releases: CMSRelease[];
  songs: CMSSong[];
  assets: CMSAsset[];
  timelineItems: ArtistTimelineItem[];
  homepageConfig: CMSHomepageConfig;
  notifications: AdminNotification[];
  /** True while the initial Supabase data load is in flight. */
  isLoading: boolean;
  /** Reflects the state of the most recent background write. */
  syncState: SyncState;
  /** Whether live data is from Supabase or the static seed files. */
  dataSource: DataSource;
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
  /**
   * Publishes a release and automatically publishes all non-archived songs
   * linked to that release.
   */
  publishRelease: (id: string) => CMSRelease | undefined;
  deleteRelease: (id: string) => void;
  updateTracklist: (releaseId: string, tracklist: CMSSong[]) => void;

  // Songs
  getSongById: (id: string) => CMSSong | undefined;
  getSongBySlug: (slug: string) => CMSSong | undefined;
  getPublicSongs: () => CMSSong[];
  getSongsForRelease: (releaseSlug: string) => CMSSong[];
  getSongsForArtist: (artistSlug: string) => CMSSong[];
  createSong: (data: Omit<CMSSong, "id" | "createdAt" | "updatedAt">) => CMSSong;
  updateSong: (id: string, data: Partial<CMSSong>) => CMSSong | undefined;
  deleteSong: (id: string) => void;

  // Timeline
  getTimelineItemsForArtist: (artistSlug: string) => ArtistTimelineItem[];
  createTimelineItem: (
    data: Omit<ArtistTimelineItem, "id" | "createdAt" | "updatedAt">
  ) => ArtistTimelineItem;
  updateTimelineItem: (
    id: string,
    data: Partial<ArtistTimelineItem>
  ) => ArtistTimelineItem | undefined;
  deleteTimelineItem: (id: string) => void;

  // Assets
  getAssetById: (id: string) => CMSAsset | undefined;
  getAssetsForEntity: (entityType: AssetAttachment["entityType"], entityId: string) => CMSAsset[];
  addAsset: (asset: Omit<CMSAsset, "id" | "createdAt">) => CMSAsset;
  updateAsset: (id: string, data: Partial<CMSAsset>) => CMSAsset | undefined;
  deleteAsset: (id: string) => void;
  /**
   * Attaches an asset to an entity. Adds the attachment entry to the asset's
   * `attachedTo` array (no duplicates) and persists to DB.
   */
  attachAssetToEntity: (assetId: string, attachment: AssetAttachment) => void;
  /**
   * Removes a specific entity attachment from an asset's `attachedTo` array.
   */
  detachAssetFromEntity: (assetId: string, entityType: AssetAttachment["entityType"], entityId: string) => void;

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
  // ── Initial state: empty when Supabase is configured (data loaded on mount),
  //    seed data only in local dev when Supabase is not configured ──
  const [artists, setArtists] = useState<CMSArtist[]>(
    () => hasSupabase() ? [] : (seedArtists as CMSArtist[])
  );
  const [producers, setProducers] = useState<CMSProducer[]>(
    () => hasSupabase() ? [] : (seedProducers as CMSProducer[])
  );
  const [brands, setBrands] = useState<CMSBrand[]>(
    () => hasSupabase() ? [] : (seedBrands as CMSBrand[])
  );
  const [releases, setReleases] = useState<CMSRelease[]>(
    () => hasSupabase() ? [] : (seedReleases as CMSRelease[])
  );
  const [songs, setSongs] = useState<CMSSong[]>(
    () => hasSupabase() ? [] : (seedSongs as CMSSong[])
  );
  const [assets, setAssets] = useState<CMSAsset[]>([]);
  const [timelineItems, setTimelineItems] = useState<ArtistTimelineItem[]>([]);
  const [homepageConfig, setHomepageConfig] = useState<CMSHomepageConfig>(
    defaultHomepageConfig
  );
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(() => hasSupabase());
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [dataSource, setDataSource] = useState<DataSource>(
    () => hasSupabase() ? "db" : "seed"
  );

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
      sb.from("songs").select("*").order("created_at", { ascending: false }),
      sb.from("assets").select("*").order("created_at", { ascending: false }),
      sb.from("homepage_config").select("*").eq("id", "homepage").single(),
      sb.from("artist_timeline_items").select("*").order("event_date", { ascending: false }),
    ])
      .then(([a, p, b, r, so, as, hp, tl]) => {
        if (a.data) setArtists(a.data.map(rowToArtist));
        if (p.data) setProducers(p.data.map(rowToProducer));
        if (b.data) setBrands(b.data.map(rowToBrand));
        if (r.data) setReleases(r.data.map(rowToRelease));
        if (so.data) setSongs(so.data.map(rowToSong));
        if (as.data) setAssets(as.data.map(rowToAsset));
        if (hp.data) setHomepageConfig(rowToHomepageConfig(hp.data));
        if (tl.data) setTimelineItems(tl.data.map(rowToTimelineItem));
        if (a.error) console.error("[CMS] artists load:", a.error.message);
        if (p.error) console.error("[CMS] producers load:", p.error.message);
        if (b.error) console.error("[CMS] brands load:", b.error.message);
        if (r.error) console.error("[CMS] releases load:", r.error.message);
        if (so.error) console.error("[CMS] songs load:", so.error.message);
        if (as.error) console.error("[CMS] assets load:", as.error.message);
        setDataSource("db");
      })
      .catch((err) => console.error("[CMS] initial load failed:", err))
      .finally(() => setIsLoading(false));
  }, []); // run once on mount

  // ── Supabase background sync helper (with rollback) ───────────────────────

  function bgSync(
    dbOperation: (sb: ReturnType<typeof createClient>) => PromiseLike<{ error: { message: string } | null }>,
    rollback?: () => void
  ) {
    if (!hasSupabase()) return;
    const sb = createClient();
    setSyncState("syncing");
    Promise.resolve(dbOperation(sb)).then(({ error }) => {
      if (error) {
        console.error("[CMS] sync error:", error.message);
        notify("error", `Sync failed: ${error.message}`);
        setSyncState("error");
        if (rollback) rollback();
        // Auto-clear error state after 4 s so the indicator resets
        setTimeout(() => setSyncState("idle"), 4000);
      } else {
        setSyncState("idle");
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
      bgSync(
        (sb) =>
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
            provider_config: artist.providerConfig ?? null,
          }),
        () => setArtists((prev) => prev.filter((a) => a.id !== artist.id))
      );
      return artist;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateArtist = useCallback(
    (id: string, data: Partial<CMSArtist>): CMSArtist | undefined => {
      let original: CMSArtist | undefined;
      let updated: CMSArtist | undefined;
      setArtists((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          original = a;
          updated = { ...a, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        const orig = original;
        bgSync(
          (sb) =>
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
              provider_config: u.providerConfig ?? null,
              updated_at: u.updatedAt,
            }).eq("id", id),
          orig ? () => setArtists((prev) => prev.map((a) => (a.id === id ? orig : a))) : undefined
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteArtist = useCallback((id: string) => {
    let removed: CMSArtist | undefined;
    setArtists((prev) => {
      removed = prev.find((a) => a.id === id);
      return prev.filter((a) => a.id !== id);
    });
    bgSync(
      (sb) => sb.from("artists").delete().eq("id", id),
      removed ? () => setArtists((prev) => [...prev, removed!]) : undefined
    );
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
      bgSync(
        (sb) =>
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
          }),
        () => setProducers((prev) => prev.filter((p) => p.id !== producer.id))
      );
      return producer;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateProducer = useCallback(
    (id: string, data: Partial<CMSProducer>): CMSProducer | undefined => {
      let original: CMSProducer | undefined;
      let updated: CMSProducer | undefined;
      setProducers((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          original = p;
          updated = { ...p, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        const orig = original;
        bgSync(
          (sb) =>
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
            }).eq("id", id),
          orig ? () => setProducers((prev) => prev.map((p) => (p.id === id ? orig : p))) : undefined
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteProducer = useCallback((id: string) => {
    let removed: CMSProducer | undefined;
    setProducers((prev) => {
      removed = prev.find((p) => p.id === id);
      return prev.filter((p) => p.id !== id);
    });
    bgSync(
      (sb) => sb.from("producers").delete().eq("id", id),
      removed ? () => setProducers((prev) => [...prev, removed!]) : undefined
    );
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
      bgSync(
        (sb) =>
          sb.from("brands").insert({
            id: brand.id,
            slug: brand.slug,
            name: brand.name,
            category: brand.category,
            descriptor: brand.descriptor,
            tagline: brand.tagline,
            manifesto: brand.manifesto ?? null,
            hero_copy: brand.heroCopy ?? null,
            hero_headline: brand.heroHeadline ?? null,
            hero_subcopy: brand.heroSubcopy ?? null,
            long_description: brand.longDescription ?? null,
            hero_image_url: brand.heroImageUrl ?? null,
            logo_url: brand.logoUrl ?? null,
            accent_color: brand.accentColor ?? null,
            hero_style: brand.heroStyle ?? null,
            campaign_status: sanitizeCampaignStatus(brand.campaignStatus),
            collection_name: brand.collectionName ?? null,
            featured_release_slugs: brand.featuredReleaseSlugs ?? null,
            featured_asset_ids: brand.featuredAssetIds ?? null,
            is_active: brand.isActive,
            featured_on_homepage: brand.featuredOnHomepage ?? false,
            sort_order: brand.sortOrder ?? 0,
          }),
        () => setBrands((prev) => prev.filter((b) => b.id !== brand.id))
      );
      return brand;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateBrand = useCallback(
    (id: string, data: Partial<CMSBrand>): CMSBrand | undefined => {
      let original: CMSBrand | undefined;
      let updated: CMSBrand | undefined;
      setBrands((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          original = b;
          updated = { ...b, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        const orig = original;
        bgSync(
          (sb) =>
            sb.from("brands").update({
              name: u.name,
              category: u.category,
              descriptor: u.descriptor,
              tagline: u.tagline,
              manifesto: u.manifesto ?? null,
              hero_copy: u.heroCopy ?? null,
              hero_headline: u.heroHeadline ?? null,
              hero_subcopy: u.heroSubcopy ?? null,
              long_description: u.longDescription ?? null,
              hero_image_url: u.heroImageUrl ?? null,
              logo_url: u.logoUrl ?? null,
              accent_color: u.accentColor ?? null,
              hero_style: u.heroStyle ?? null,
              campaign_status: sanitizeCampaignStatus(u.campaignStatus),
              collection_name: u.collectionName ?? null,
              featured_release_slugs: u.featuredReleaseSlugs ?? null,
              featured_asset_ids: u.featuredAssetIds ?? null,
              is_active: u.isActive,
              featured_on_homepage: u.featuredOnHomepage ?? false,
              sort_order: u.sortOrder ?? 0,
              updated_at: u.updatedAt,
            }).eq("id", id),
          orig ? () => setBrands((prev) => prev.map((b) => (b.id === id ? orig : b))) : undefined
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteBrand = useCallback((id: string) => {
    let removed: CMSBrand | undefined;
    setBrands((prev) => {
      removed = prev.find((b) => b.id === id);
      return prev.filter((b) => b.id !== id);
    });
    bgSync(
      (sb) => sb.from("brands").delete().eq("id", id),
      removed ? () => setBrands((prev) => [...prev, removed!]) : undefined
    );
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
      bgSync(
        (sb) =>
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
            dsp_links: release.dspLinks ?? null,
            provider_config: release.providerConfig ?? null,
            rights_metadata: release.rightsMetadata ?? null,
            distribution_record: release.distributionRecord ?? null,
            data_source: release.dataSource ?? null,
          }),
        () => setReleases((prev) => prev.filter((r) => r.id !== release.id))
      );
      return release;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateRelease = useCallback(
    (id: string, data: Partial<CMSRelease>): CMSRelease | undefined => {
      let original: CMSRelease | undefined;
      let updated: CMSRelease | undefined;
      setReleases((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          original = r;
          updated = { ...r, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        const orig = original;
        bgSync(
          (sb) =>
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
              dsp_links: u.dspLinks ?? null,
              provider_config: u.providerConfig ?? null,
              rights_metadata: u.rightsMetadata ?? null,
              distribution_record: u.distributionRecord ?? null,
              data_source: u.dataSource ?? null,
              updated_at: u.updatedAt,
            }).eq("id", id),
          orig ? () => setReleases((prev) => prev.map((r) => (r.id === id ? orig : r))) : undefined
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * publishRelease — transitions to "published" + isVisible = true.
   *
   * Automation: all songs linked to this release whose status is NOT
   * "archived" are automatically published too, so they immediately appear
   * on the public artist and release pages.
   */
  const publishRelease = useCallback(
    (id: string): CMSRelease | undefined => {
      const release = releases.find((r) => r.id === id);
      const result = updateRelease(id, {
        status: "published",
        isVisible: true,
        publishAt: now(),
      });
      // Auto-publish linked songs
      if (release) {
        const linkedSongs = songs.filter(
          (s) => s.releaseSlug === release.slug && s.status !== "archived"
        );
        linkedSongs.forEach((s) => {
          const t = now();
          setSongs((prev) =>
            prev.map((existing) =>
              existing.id === s.id
                ? { ...existing, status: "published", isVisible: true, updatedAt: t }
                : existing
            )
          );
          bgSync((sb) =>
            sb.from("songs")
              .update({ status: "published", is_visible: true, updated_at: t })
              .eq("id", s.id)
          );
        });
        if (linkedSongs.length > 0) {
          notify(
            "success",
            `${linkedSongs.length} linked song${linkedSongs.length !== 1 ? "s" : ""} published automatically.`
          );
        }
      }
      return result;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [releases, songs, updateRelease]
  );

  const deleteRelease = useCallback((id: string) => {
    let removed: CMSRelease | undefined;
    setReleases((prev) => {
      removed = prev.find((r) => r.id === id);
      return prev.filter((r) => r.id !== id);
    });
    bgSync(
      (sb) => sb.from("releases").delete().eq("id", id),
      removed ? () => setReleases((prev) => [...prev, removed!]) : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTracklist = useCallback(
    (releaseId: string, tracklist: CMSSong[]) => {
      let original: CMSRelease | undefined;
      setReleases((prev) =>
        prev.map((r) => {
          if (r.id !== releaseId) return r;
          original = r;
          return { ...r, tracklist, updatedAt: now() };
        })
      );
      const orig = original;
      bgSync(
        (sb) =>
          sb.from("releases").update({
            tracklist,
            updated_at: now(),
          }).eq("id", releaseId),
        orig ? () => setReleases((prev) => prev.map((r) => (r.id === releaseId ? orig : r))) : undefined
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Songs ──────────────────────────────────────────────────────────────────

  const getSongById = useCallback(
    (id: string) => songs.find((s) => s.id === id),
    [songs]
  );

  const getSongBySlug = useCallback(
    (slug: string) => songs.find((s) => s.slug === slug),
    [songs]
  );

  const getPublicSongs = useCallback(
    () => songs.filter((s) => s.status === "published" && s.isVisible),
    [songs]
  );

  const getSongsForRelease = useCallback(
    (releaseSlug: string) =>
      songs
        .filter((s) => s.releaseSlug === releaseSlug && s.status === "published" && s.isVisible)
        .sort((a, b) => (a.trackNumber ?? 999) - (b.trackNumber ?? 999)),
    [songs]
  );

  const getSongsForArtist = useCallback(
    (artistSlug: string) =>
      songs.filter((s) => s.artistSlug === artistSlug && s.status === "published" && s.isVisible),
    [songs]
  );

  const createSong = useCallback(
    (data: Omit<CMSSong, "id" | "createdAt" | "updatedAt">): CMSSong => {
      const song: CMSSong = {
        ...data,
        id: data.slug || generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setSongs((prev) => [...prev, song]);
      bgSync(
        (sb) =>
          sb.from("songs").insert({
            id: song.id,
            slug: song.slug,
            title: song.title,
            artist_slug: song.artistSlug,
            artist_name: song.artistName,
            release_slug: song.releaseSlug ?? null,
            release_name: song.releaseName ?? null,
            producer_slugs: song.producerSlugs ?? null,
            genre: song.genre ?? null,
            duration: song.duration ?? null,
            audio_url: song.audioUrl ?? null,
            lyrics: song.lyrics ?? null,
            is_explicit: song.isExplicit ?? false,
            track_number: song.trackNumber ?? null,
            status: song.status,
            is_visible: song.isVisible,
            publish_at: song.publishAt ?? null,
            featured_on_homepage: song.featuredOnHomepage ?? false,
            media_asset_id: song.mediaAssetId ?? null,
            dsp_links: song.dspLinks ?? null,
            isrc: song.isrc ?? null,
            rights_metadata: song.rightsMetadata ?? null,
            data_source: song.dataSource ?? null,
          }),
        () => setSongs((prev) => prev.filter((s) => s.id !== song.id))
      );
      return song;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateSong = useCallback(
    (id: string, data: Partial<CMSSong>): CMSSong | undefined => {
      let original: CMSSong | undefined;
      let updated: CMSSong | undefined;
      setSongs((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          original = s;
          updated = { ...s, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        const orig = original;
        bgSync(
          (sb) =>
            sb.from("songs").update({
              title: u.title,
              artist_slug: u.artistSlug,
              artist_name: u.artistName,
              release_slug: u.releaseSlug ?? null,
              release_name: u.releaseName ?? null,
              producer_slugs: u.producerSlugs ?? null,
              genre: u.genre ?? null,
              duration: u.duration ?? null,
              audio_url: u.audioUrl ?? null,
              lyrics: u.lyrics ?? null,
              is_explicit: u.isExplicit ?? false,
              track_number: u.trackNumber ?? null,
              status: u.status,
              is_visible: u.isVisible,
              publish_at: u.publishAt ?? null,
              featured_on_homepage: u.featuredOnHomepage ?? false,
              media_asset_id: u.mediaAssetId ?? null,
              dsp_links: u.dspLinks ?? null,
              isrc: u.isrc ?? null,
              rights_metadata: u.rightsMetadata ?? null,
              data_source: u.dataSource ?? null,
              updated_at: u.updatedAt,
            }).eq("id", id),
          orig ? () => setSongs((prev) => prev.map((s) => (s.id === id ? orig : s))) : undefined
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteSong = useCallback((id: string) => {
    let removed: CMSSong | undefined;
    setSongs((prev) => {
      removed = prev.find((s) => s.id === id);
      return prev.filter((s) => s.id !== id);
    });
    bgSync(
      (sb) => sb.from("songs").delete().eq("id", id),
      removed ? () => setSongs((prev) => [...prev, removed!]) : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timeline ───────────────────────────────────────────────────────────────

  const getTimelineItemsForArtist = useCallback(
    (artistSlug: string) =>
      timelineItems
        .filter((t) => t.artistSlug === artistSlug)
        .sort(
          (a, b) =>
            new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
        ),
    [timelineItems]
  );

  const createTimelineItem = useCallback(
    (
      data: Omit<ArtistTimelineItem, "id" | "createdAt" | "updatedAt">
    ): ArtistTimelineItem => {
      const item: ArtistTimelineItem = {
        ...data,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setTimelineItems((prev) => [...prev, item]);
      bgSync(
        (sb) =>
          sb.from("artist_timeline_items").insert({
            id: item.id,
            artist_slug: item.artistSlug,
            type: item.type,
            title: item.title,
            description: item.description ?? null,
            event_date: item.eventDate,
            end_date: item.endDate ?? null,
            status: item.status,
            visibility: item.visibility,
            linked_release_slug: item.linkedReleaseSlug ?? null,
            linked_song_slug: item.linkedSongSlug ?? null,
            linked_asset_ids: item.linkedAssetIds ?? null,
            tags: item.tags ?? null,
            importance: item.importance,
            lyric_engine_eligible: item.lyricEngineEligible,
          }),
        () =>
          setTimelineItems((prev) => prev.filter((t) => t.id !== item.id))
      );
      return item;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateTimelineItem = useCallback(
    (
      id: string,
      data: Partial<ArtistTimelineItem>
    ): ArtistTimelineItem | undefined => {
      let original: ArtistTimelineItem | undefined;
      let updated: ArtistTimelineItem | undefined;
      setTimelineItems((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          original = t;
          updated = { ...t, ...data, updatedAt: now() };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        const orig = original;
        bgSync(
          (sb) =>
            sb.from("artist_timeline_items").update({
              artist_slug: u.artistSlug,
              type: u.type,
              title: u.title,
              description: u.description ?? null,
              event_date: u.eventDate,
              end_date: u.endDate ?? null,
              status: u.status,
              visibility: u.visibility,
              linked_release_slug: u.linkedReleaseSlug ?? null,
              linked_song_slug: u.linkedSongSlug ?? null,
              linked_asset_ids: u.linkedAssetIds ?? null,
              tags: u.tags ?? null,
              importance: u.importance,
              lyric_engine_eligible: u.lyricEngineEligible,
              updated_at: u.updatedAt,
            }).eq("id", id),
          orig
            ? () =>
                setTimelineItems((prev) =>
                  prev.map((t) => (t.id === id ? orig! : t))
                )
            : undefined
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteTimelineItem = useCallback((id: string) => {
    let removed: ArtistTimelineItem | undefined;
    setTimelineItems((prev) => {
      removed = prev.find((t) => t.id === id);
      return prev.filter((t) => t.id !== id);
    });
    bgSync(
      (sb) => sb.from("artist_timeline_items").delete().eq("id", id),
      removed
        ? () => setTimelineItems((prev) => [...prev, removed!])
        : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Assets ─────────────────────────────────────────────────────────────────

  const getAssetById = useCallback(
    (id: string) => assets.find((a) => a.id === id),
    [assets]
  );

  const getAssetsForEntity = useCallback(
    (entityType: AssetAttachment["entityType"], entityId: string) =>
      assets.filter((a) =>
        a.attachedTo?.some(
          (att) => att.entityType === entityType && att.entityId === entityId
        )
      ),
    [assets]
  );

  const addAsset = useCallback(
    (data: Omit<CMSAsset, "id" | "createdAt">): CMSAsset => {
      const asset: CMSAsset = { ...data, id: generateId(), createdAt: now() };
      setAssets((prev) => [...prev, asset]);
      bgSync(
        (sb) =>
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
          }),
        () => setAssets((prev) => prev.filter((a) => a.id !== asset.id))
      );
      return asset;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const updateAsset = useCallback(
    (id: string, data: Partial<CMSAsset>): CMSAsset | undefined => {
      let original: CMSAsset | undefined;
      let updated: CMSAsset | undefined;
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          original = a;
          updated = { ...a, ...data };
          return updated;
        })
      );
      if (updated) {
        const u = updated;
        const orig = original;
        bgSync(
          (sb) =>
            sb.from("assets").update({
              alt_text: u.altText ?? null,
              attached_to: u.attachedTo ?? null,
            }).eq("id", id),
          orig ? () => setAssets((prev) => prev.map((a) => (a.id === id ? orig : a))) : undefined
        );
      }
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const deleteAsset = useCallback((id: string) => {
    let removed: CMSAsset | undefined;
    setAssets((prev) => {
      removed = prev.find((a) => a.id === id);
      return prev.filter((a) => a.id !== id);
    });
    bgSync(
      (sb) => sb.from("assets").delete().eq("id", id),
      removed ? () => setAssets((prev) => [...prev, removed!]) : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attachAssetToEntity = useCallback(
    (assetId: string, attachment: AssetAttachment) => {
      let original: CMSAsset | undefined;
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== assetId) return a;
          original = a;
          const existing = a.attachedTo ?? [];
          // Prevent duplicate for the same entity + role
          const isDuplicate = existing.some(
            (att) =>
              att.entityType === attachment.entityType &&
              att.entityId === attachment.entityId &&
              att.role === attachment.role
          );
          if (isDuplicate) return a;
          return { ...a, attachedTo: [...existing, attachment] };
        })
      );
      const orig = original;
      bgSync(
        (sb) => {
          const current = assets.find((a) => a.id === assetId);
          const existing = current?.attachedTo ?? [];
          const isDuplicate = existing.some(
            (att) =>
              att.entityType === attachment.entityType &&
              att.entityId === attachment.entityId &&
              att.role === attachment.role
          );
          const newAttachments = isDuplicate ? existing : [...existing, attachment];
          return sb.from("assets").update({ attached_to: newAttachments }).eq("id", assetId);
        },
        orig ? () => setAssets((prev) => prev.map((a) => (a.id === assetId ? orig : a))) : undefined
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assets]
  );

  const detachAssetFromEntity = useCallback(
    (
      assetId: string,
      entityType: AssetAttachment["entityType"],
      entityId: string
    ) => {
      let original: CMSAsset | undefined;
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== assetId) return a;
          original = a;
          const filtered = (a.attachedTo ?? []).filter(
            (att) =>
              !(att.entityType === entityType && att.entityId === entityId)
          );
          return { ...a, attachedTo: filtered };
        })
      );
      const orig = original;
      bgSync(
        (sb) => {
          const current = assets.find((a) => a.id === assetId);
          const filtered = (current?.attachedTo ?? []).filter(
            (att) =>
              !(att.entityType === entityType && att.entityId === entityId)
          );
          return sb.from("assets").update({ attached_to: filtered }).eq("id", assetId);
        },
        orig ? () => setAssets((prev) => prev.map((a) => (a.id === assetId ? orig : a))) : undefined
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assets]
  );

  // ── Homepage ───────────────────────────────────────────────────────────────

  const updateHomepageConfig = useCallback(
    (data: Partial<CMSHomepageConfig>) => {
      let original: CMSHomepageConfig | undefined;
      setHomepageConfig((prev) => {
        original = prev;
        const updated = { ...prev, ...data, updatedAt: now() };
        const orig = original;
        bgSync(
          (sb) =>
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
            }),
          orig ? () => setHomepageConfig(orig) : undefined
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
    songs,
    assets,
    timelineItems,
    homepageConfig,
    notifications,
    isLoading,
    syncState,
    dataSource,
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
    getSongById,
    getSongBySlug,
    getPublicSongs,
    getSongsForRelease,
    getSongsForArtist,
    createSong,
    updateSong,
    deleteSong,
    getTimelineItemsForArtist,
    createTimelineItem,
    updateTimelineItem,
    deleteTimelineItem,
    getAssetById,
    getAssetsForEntity,
    addAsset,
    updateAsset,
    deleteAsset,
    attachAssetToEntity,
    detachAssetFromEntity,
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
