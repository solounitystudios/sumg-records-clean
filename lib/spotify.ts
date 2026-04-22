/**
 * lib/spotify.ts
 *
 * Server-side Spotify API client using the Client Credentials flow.
 * Secrets (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) are never exposed to the browser.
 * Tokens are cached in-process and refreshed automatically when they expire.
 *
 * All public functions return null / empty arrays on failure so callers can
 * render gracefully without Spotify data.
 */
import "server-only";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: SpotifyImage[];
  external_urls: { spotify: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  popularity: number;
  duration_ms: number;
  explicit: boolean;
  preview_url: string | null;
  external_urls: { spotify: string };
  album: {
    id: string;
    name: string;
    release_date: string;
    images: SpotifyImage[];
    external_urls: { spotify: string };
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: "album" | "single" | "compilation";
  release_date: string;
  total_tracks: number;
  images: SpotifyImage[];
  external_urls: { spotify: string };
}

/** A simplified track as it appears inline inside an album response. */
export interface SpotifySimpleTrack {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
  explicit: boolean;
  preview_url: string | null;
  external_urls: { spotify: string };
}

/** Full album object returned by GET /albums/{id} — includes inline tracks. */
export interface SpotifyAlbumFull extends SpotifyAlbum {
  label?: string;
  artists: { id: string; name: string; external_urls: { spotify: string } }[];
  tracks: { items: SpotifySimpleTrack[] };
}

export interface SpotifySearchResult {
  artists?: { items: SpotifyArtist[] };
  albums?: { items: SpotifyAlbum[] };
  tracks?: { items: SpotifyTrack[] };
}

// ─── Token cache ──────────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix ms
}

let _tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("[spotify] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`[spotify] Token fetch failed with status ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return _tokenCache.accessToken;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

type SpotifyFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

const SPOTIFY_API = "https://api.spotify.com/v1";

async function spotifyFetch<T>(path: string, revalidate = 3600): Promise<T> {
  const token = await getAccessToken();
  const init: SpotifyFetchInit = {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate },
  };
  const res = await fetch(`${SPOTIFY_API}${path}`, init);
  if (!res.ok) {
    throw new Error(`[spotify] ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function isValidSpotifyId(id: string): boolean {
  return /^[A-Za-z0-9]{22}$/.test(id);
}

export function extractSpotifyArtistId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const urlMatch = urlOrId.match(/spotify\.com\/artist\/([A-Za-z0-9]{22})/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = urlOrId.match(/^spotify:artist:([A-Za-z0-9]{22})$/);
  if (uriMatch) return uriMatch[1];
  if (/^[A-Za-z0-9]{22}$/.test(urlOrId)) return urlOrId;
  return null;
}

export function extractSpotifyAlbumId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const urlMatch = urlOrId.match(/spotify\.com\/album\/([A-Za-z0-9]{22})/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = urlOrId.match(/^spotify:album:([A-Za-z0-9]{22})$/);
  if (uriMatch) return uriMatch[1];
  if (/^[A-Za-z0-9]{22}$/.test(urlOrId)) return urlOrId;
  return null;
}

export function extractSpotifyTrackId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const urlMatch = urlOrId.match(/spotify\.com\/track\/([A-Za-z0-9]{22})/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = urlOrId.match(/^spotify:track:([A-Za-z0-9]{22})$/);
  if (uriMatch) return uriMatch[1];
  if (/^[A-Za-z0-9]{22}$/.test(urlOrId)) return urlOrId;
  return null;
}

export function pickSpotifyImage(
  images: SpotifyImage[],
  targetWidth = 640
): SpotifyImage | undefined {
  if (!images.length) return undefined;
  return images.reduce((best, img) => {
    const bestDiff = Math.abs((best.width ?? 640) - targetWidth);
    const imgDiff = Math.abs((img.width ?? 640) - targetWidth);
    return imgDiff < bestDiff ? img : best;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getSpotifyArtist(id: string): Promise<SpotifyArtist | null> {
  try {
    return await spotifyFetch<SpotifyArtist>(`/artists/${id}`);
  } catch (err) {
    console.error("[spotify] getSpotifyArtist:", err);
    return null;
  }
}

export async function searchSpotifyArtists(query: string, limit = 5): Promise<SpotifyArtist[]> {
  const params = new URLSearchParams({ q: query, type: "artist", limit: String(Math.min(limit, 50)) });
  try {
    const data = await spotifyFetch<{ artists: { items: SpotifyArtist[] } }>(`/search?${params}`);
    return data.artists.items;
  } catch {
    return [];
  }
}

export async function getSpotifyArtistTopTracks(id: string, market = "US"): Promise<SpotifyTrack[]> {
  try {
    const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(
      `/artists/${id}/top-tracks?market=${market}`
    );
    return data.tracks;
  } catch (err) {
    console.error("[spotify] getSpotifyArtistTopTracks:", err);
    return [];
  }
}

export async function getSpotifyArtistAlbums(id: string, limit = 6): Promise<SpotifyAlbum[]> {
  try {
    const data = await spotifyFetch<{ items: SpotifyAlbum[] }>(
      `/artists/${id}/albums?include_groups=album,single&market=US&limit=${limit}`
    );
    return data.items;
  } catch (err) {
    console.error("[spotify] getSpotifyArtistAlbums:", err);
    return [];
  }
}

export async function getSpotifyAlbum(id: string): Promise<SpotifyAlbumFull | null> {
  try {
    return await spotifyFetch<SpotifyAlbumFull>(`/albums/${id}`);
  } catch (err) {
    console.error("[spotify] getSpotifyAlbum:", err);
    return null;
  }
}

export async function searchSpotify(
  query: string,
  types: Array<"artist" | "album" | "track"> = ["artist"],
  limit = 10
): Promise<SpotifySearchResult> {
  try {
    const q = encodeURIComponent(query);
    const type = types.join(",");
    return await spotifyFetch<SpotifySearchResult>(
      `/search?q=${q}&type=${type}&limit=${limit}`,
      300
    );
  } catch (err) {
    console.error("[spotify] searchSpotify:", err);
    return {};
  }
}

// ─── Audio features ───────────────────────────────────────────────────────────

interface RawAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: 0 | 1;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
}

export async function getSpotifyAudioFeatures(trackId: string): Promise<RawAudioFeatures | null> {
  try {
    return await spotifyFetch<RawAudioFeatures>(
      `/audio-features/${trackId}`,
      86400
    );
  } catch (err) {
    console.error("[spotify] getSpotifyAudioFeatures:", err);
    return null;
  }
}
