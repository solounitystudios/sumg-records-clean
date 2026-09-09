import { createClient } from "@supabase/supabase-js";
import { CMSArtist, CMSBrand, CMSProducer, CMSRelease, CMSSong } from "@/lib/types";
import { rowToArtist, rowToProducer, rowToBrand, rowToRelease, rowToSong } from "./mappers";
import { artists as rawArtists } from "@/data/artists";
import { brands as rawBrands } from "@/data/brands";
import { producers as rawProducers } from "@/data/producers";
import { releases as rawReleases } from "@/data/releases";
import { songs as rawSongs } from "@/data/songs";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url?.startsWith("https://") || !key) return null;
  return createClient(url, key);
}

// ─── Releases ────────────────────────────────────────────────────────────────

export async function getPublishedReleases(): Promise<CMSRelease[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("releases")
      .select("*")
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) {
      return data
        .map(rowToRelease)
        .filter((r) => {
          if (!r.publishAt) return true;
          return new Date(r.publishAt) <= new Date();
        });
    }
    if (error) console.error("[cms] releases:", error.message);
  }
  return (rawReleases as CMSRelease[])
    .filter((r) => r.status === "published" && r.isVisible)
    .filter((r) => {
      if (!r.publishAt) return true;
      return new Date(r.publishAt) <= new Date();
    });
}

export async function getReleaseBySlug(slug: string): Promise<CMSRelease | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("releases")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .eq("is_visible", true)
      .maybeSingle();
    if (!error && data) return rowToRelease(data);
    if (error) console.error("[cms] release by slug:", error.message);
  }
  return (rawReleases as CMSRelease[]).find(
    (r) => r.slug === slug && r.status === "published" && r.isVisible
  );
}

export async function getArtistReleases(artistSlug: string): Promise<CMSRelease[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("releases")
      .select("*")
      .eq("artist_slug", artistSlug)
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) {
      return data
        .map(rowToRelease)
        .filter((r) => {
          if (!r.publishAt) return true;
          return new Date(r.publishAt) <= new Date();
        });
    }
    if (error) console.error("[cms] artist releases:", error.message);
  }
  const published = (rawReleases as CMSRelease[])
    .filter((r) => r.status === "published" && r.isVisible)
    .filter((r) => {
      if (!r.publishAt) return true;
      return new Date(r.publishAt) <= new Date();
    });
  return published.filter((r) => r.artistSlug === artistSlug);
}

// ─── Artists ─────────────────────────────────────────────────────────────────

export async function getAllArtists(): Promise<CMSArtist[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("artists")
      .select("*")
      .eq("status", "active")
      .order("sort_order", { ascending: true });
    if (!error && data) return data.map(rowToArtist);
    if (error) console.error("[cms] artists:", error.message);
  }
  return (rawArtists as CMSArtist[]).filter((a) => !a.status || a.status === "active");
}

export async function getArtistBySlug(slug: string): Promise<CMSArtist | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("artists")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    if (!error && data) return rowToArtist(data);
    if (error) console.error("[cms] artist by slug:", error.message);
  }
  return (rawArtists as CMSArtist[]).find(
    (a) => a.slug === slug && (!a.status || a.status === "active")
  );
}

// ─── Producers ───────────────────────────────────────────────────────────────

export async function getAllProducers(): Promise<CMSProducer[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("producers")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) return data.map(rowToProducer);
    if (error) console.error("[cms] producers:", error.message);
  }
  return rawProducers as CMSProducer[];
}

export async function getProducerBySlug(slug: string): Promise<CMSProducer | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("producers")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!error && data) return rowToProducer(data);
    if (error) console.error("[cms] producer by slug:", error.message);
  }
  return (rawProducers as CMSProducer[]).find((p) => p.slug === slug);
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export async function getAllBrands(): Promise<CMSBrand[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("brands")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) return data.map(rowToBrand);
    if (error) console.error("[cms] brands:", error.message);
  }
  return rawBrands as CMSBrand[];
}

export async function getBrandBySlug(slug: string): Promise<CMSBrand | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("brands")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!error && data) return rowToBrand(data);
    if (error) console.error("[cms] brand by slug:", error.message);
  }
  return (rawBrands as CMSBrand[]).find((b) => b.slug === slug);
}

// ─── Songs ───────────────────────────────────────────────────────────────────

export async function getPublicSongs(): Promise<CMSSong[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("songs")
      .select("*")
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) return data.map(rowToSong);
    if (error) console.error("[cms] songs:", error.message);
  }
  return (rawSongs as CMSSong[]).filter((s) => s.status === "published" && s.isVisible);
}

export async function getSongBySlug(slug: string): Promise<CMSSong | undefined> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("songs")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .eq("is_visible", true)
      .maybeSingle();
    if (!error && data) return rowToSong(data);
    if (error) console.error("[cms] song by slug:", error.message);
  }
  return (rawSongs as CMSSong[]).find(
    (s) => s.slug === slug && s.status === "published" && s.isVisible
  );
}

export async function getSongsForArtist(artistSlug: string): Promise<CMSSong[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("songs")
      .select("*")
      .eq("artist_slug", artistSlug)
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) return data.map(rowToSong);
    if (error) console.error("[cms] songs for artist:", error.message);
  }
  return (rawSongs as CMSSong[]).filter(
    (s) => s.artistSlug === artistSlug && s.status === "published" && s.isVisible
  );
}

export async function getSongsForRelease(releaseSlug: string): Promise<CMSSong[]> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data, error } = await sb
      .from("songs")
      .select("*")
      .eq("release_slug", releaseSlug)
      .eq("status", "published")
      .eq("is_visible", true);
    if (!error && data) return data.map(rowToSong);
    if (error) console.error("[cms] songs for release:", error.message);
  }
  return (rawSongs as CMSSong[]).filter(
    (s) => s.releaseSlug === releaseSlug && s.status === "published" && s.isVisible
  );
}

export async function getAllPublicSongSlugs(): Promise<string[]> {
  const songs = await getPublicSongs();
  return songs.map((s) => s.slug);
}

export async function getPublicSongCountsByArtist(): Promise<Record<string, number>> {
  const sb = getSupabaseClient();
  if (sb) {
    const { data } = await sb
      .from("songs")
      .select("artist_slug")
      .eq("status", "published")
      .eq("is_visible", true);
    if (data) {
      return (data as { artist_slug: string | null }[]).reduce<Record<string, number>>((acc, s) => {
        if (s.artist_slug) acc[s.artist_slug] = (acc[s.artist_slug] ?? 0) + 1;
        return acc;
      }, {});
    }
  }
  return (rawSongs as { artistSlug?: string; status?: string; isVisible?: boolean }[])
    .filter((s) => s.status === "published" && s.isVisible)
    .reduce<Record<string, number>>((acc, s) => {
      if (s.artistSlug) acc[s.artistSlug] = (acc[s.artistSlug] ?? 0) + 1;
      return acc;
    }, {});
}

// Spotify snapshot reads/writes moved to lib/cms/admin-spotify.ts — that
// table is CMS-role-gated in RLS (no public-read policy), unlike everything
// else in this file, so it needs the session-aware server client, not the
// anon/publishable client every other function here correctly uses for
// genuinely public content. See that file for the full rationale.
