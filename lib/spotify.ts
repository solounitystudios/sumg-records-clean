/**
 * Spotify API service — server-side only.
 *
 * Uses the Client Credentials flow (no user auth required).
 * Secrets (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) are never exposed to the
 * browser.  All public API functions return null / empty arrays on failure so
 * callers can render gracefully without Spotify data.
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
  followers: { total: number };
  images: SpotifyImage[];
  popularity: number;
  external_urls: { spotify: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
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
  artists: Array<{ id: string; name: string }>;
}

export interface SpotifySearchResult {
  artists?: { items: SpotifyArtist[] };
  albums?: { items: SpotifyAlbum[] };
  tracks?: { items: SpotifyTrack[] };
}

/**
 * A simplified track as it appears inline inside an album response.
 * Unlike SpotifyTrack it has no nested album object (it is already inside one).
 */
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
  tracks: { items: SpotifySimpleTrack[] };
}

// ─── Token cache (module-level, server-only) ──────────────────────────────────

interface TokenCache {
  accessToken: string;
  /** Unix ms timestamp after which the token must be refreshed. */
  expiresAt: number;
}

let _tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Refresh 60 s before expiry to avoid edge cases
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "[spotify] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET"
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    // Never cache the token exchange response itself
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

// ─── Next.js fetch extension ──────────────────────────────────────────────────
// Next.js augments the native `RequestInit` with a `next` property for ISR
// caching, but the type definition requires a built `.next` directory to be
// present.  We redeclare the minimal shape here so the service compiles cleanly
// in all environments (CI, typecheck-only, etc.).
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

/**
 * Extract a bare Spotify artist ID from either a full Spotify URL or a raw ID.
 *
 * Accepts:
 *   - https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb
 *   - spotify:artist:4Z8W4fKeB5YxbusRsdQVPb
 *   - 4Z8W4fKeB5YxbusRsdQVPb (22-char alphanumeric)
 *
 * Returns null when the value cannot be parsed.
 */
export function extractSpotifyArtistId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  // Full URL: https://open.spotify.com/artist/{id}
  const urlMatch = urlOrId.match(/spotify\.com\/artist\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  // URI: spotify:artist:{id}
  const uriMatch = urlOrId.match(/^spotify:artist:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  // Bare 22-char alphanumeric ID
  if (/^[A-Za-z0-9]{22}$/.test(urlOrId)) return urlOrId;

  return null;
}

/**
 * Extract a bare Spotify album ID from either a full Spotify URL or a raw ID.
 *
 * Accepts:
 *   - https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy
 *   - spotify:album:4aawyAB9vmqN3uQ7FjRGTy
 *   - 4aawyAB9vmqN3uQ7FjRGTy (22-char alphanumeric)
 *
 * Returns null when the value cannot be parsed.
 */
export function extractSpotifyAlbumId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  const urlMatch = urlOrId.match(/spotify\.com\/album\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  const uriMatch = urlOrId.match(/^spotify:album:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  if (/^[A-Za-z0-9]{22}$/.test(urlOrId)) return urlOrId;

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch a single Spotify artist by ID.  Returns null on any failure. */
export async function getSpotifyArtist(
  id: string
): Promise<SpotifyArtist | null> {
  try {
    return await spotifyFetch<SpotifyArtist>(`/artists/${id}`);
  } catch (err) {
    console.error("[spotify] getSpotifyArtist:", err);
    return null;
  }
}

/**
 * Fetch up to 10 top tracks for an artist.
 * Falls back to an empty array on failure.
 */
export async function getSpotifyArtistTopTracks(
  id: string,
  market = "US"
): Promise<SpotifyTrack[]> {
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

/**
 * Fetch the most recent albums/singles for an artist.
 * Falls back to an empty array on failure.
 */
export async function getSpotifyArtistAlbums(
  id: string,
  limit = 6
): Promise<SpotifyAlbum[]> {
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

/**
 * Fetch a single Spotify album by ID, including its inline tracklist.
 * Returns null on any failure.
 */
export async function getSpotifyAlbum(
  id: string
): Promise<SpotifyAlbumFull | null> {
  try {
    return await spotifyFetch<SpotifyAlbumFull>(`/albums/${id}`);
  } catch (err) {
    console.error("[spotify] getSpotifyAlbum:", err);
    return null;
  }
}

/**
 * Search Spotify across artists, albums, and/or tracks.
 * Falls back to an empty result object on failure.
 */
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
      300 // shorter cache for search results
    );
  } catch (err) {
    console.error("[spotify] searchSpotify:", err);
    return {};
  }
}
