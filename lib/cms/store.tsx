"use client";

/**
 * In-memory CMS store — seeded from static data files.
 * In Phase 5, replace the CRUD methods with real DB/API calls (Supabase, Prisma, etc.)
 * The public interface stays identical, so no consumer changes are needed.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Returns true if a release should be visible on the public site. */
export function isReleasePublic(r: CMSRelease): boolean {
  if (!r.isVisible) return false;
  if (r.status !== "published") return false;
  if (r.publishAt && new Date(r.publishAt) > new Date()) return false;
  return true;
}

// ─── Default homepage config ────────────────────────────────────────────────

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

  // ── Notifications ──────────────────────────────────────────────────────────

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
      return artist;
    },
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
      return updated;
    },
    []
  );

  const deleteArtist = useCallback((id: string) => {
    setArtists((prev) => prev.filter((a) => a.id !== id));
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
      return producer;
    },
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
      return updated;
    },
    []
  );

  const deleteProducer = useCallback((id: string) => {
    setProducers((prev) => prev.filter((p) => p.id !== id));
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
      return brand;
    },
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
      return updated;
    },
    []
  );

  const deleteBrand = useCallback((id: string) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
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
      return release;
    },
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
      return updated;
    },
    []
  );

  /**
   * publishRelease — transitions a release to "published" and sets isVisible = true.
   * This is the auto-publish hook: when called, the release surfaces on all public pages.
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
  }, []);

  const updateTracklist = useCallback(
    (releaseId: string, tracklist: CMSSong[]) => {
      setReleases((prev) =>
        prev.map((r) =>
          r.id === releaseId ? { ...r, tracklist, updatedAt: now() } : r
        )
      );
    },
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
      return asset;
    },
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
      return updated;
    },
    []
  );

  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── Homepage ───────────────────────────────────────────────────────────────

  const updateHomepageConfig = useCallback(
    (data: Partial<CMSHomepageConfig>) => {
      setHomepageConfig((prev) => ({ ...prev, ...data, updatedAt: now() }));
    },
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
