/**
 * lib/spotify.ts
 *
 * Server-side Spotify API client using the Client Credentials flow.
 * Secrets (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) are never exposed to the browser.
 * Tokens are cached in-process and refreshed automatically when they expire.
 *
 * All public functions are safe to call from Server Components, Route Handlers,
 * and any other server-side context.
 */
import "server-only";

// ─── Token cache ──────────────────────────────────────────────────────────────

interface TokenEntry {
  accessToken: string;
  expiresAt: number; // Unix ms
}

let tokenCache: TokenEntry | null = null;

async function getSpotifyToken(): Promise<string> {
  const now = Date.now();

  // Serve cached token if still valid (with 30 s buffer)
  if (tokenCache && tokenCache.expiresAt - 30_000 > now) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET."
    );
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

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
    throw new Error(`Spotify token request failed: ${res.status}`);
  }

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token as string,
    expiresAt: now + (data.expires_in as number) * 1000,
  };

  return tokenCache.accessToken;
}

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
  popularity: number;
  followers: { total: number };
  images: SpotifyImage[];
  followers: { total: number };
  images: SpotifyImage[];
  popularity: number;
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

/** Full album object returned by /albums/:id — includes the tracks list. */
export interface SpotifyAlbumDetail extends SpotifyAlbum {
  label: string;
  artists: { id: string; name: string; external_urls: { spotify: string } }[];
  tracks: {
    items: {
      id: string;
      name: string;
      track_number: number;
      duration_ms: number;
      explicit: boolean;
      external_urls: { spotify: string };
      preview_url: string | null;
    }[];
    total: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Spotify IDs are 22-character Base62 strings.
 * Returns true only for strings that look like a valid Spotify resource ID.
 */
export function isValidSpotifyId(id: string): boolean {
  return /^[A-Za-z0-9]{22}$/.test(id);
}

/**
 * Extract a Spotify artist ID from either a bare ID string or a full Spotify URL.
 * e.g. "https://open.spotify.com/artist/4dpARuHxo51G3z768sgnrY" → "4dpARuHxo51G3z768sgnrY"
 *
 * Returns null for empty strings, malformed URLs, or values with no recognisable ID.
 * Callers should check isValidSpotifyId() on the result before making API calls.
 */
export function extractSpotifyArtistId(idOrUrl: string): string | null {
  const s = idOrUrl.trim();
  if (!s) return null;
  // Full URL: extract the segment after "artist/"
  const urlMatch = s.match(/artist\/([A-Za-z0-9]{22})/);
  if (urlMatch) return urlMatch[1];
  // Bare ID: accept only if it looks like a Spotify ID
  if (isValidSpotifyId(s)) return s;
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
  const urlMatch = urlOrId.match(/spotify\.com\/artist\/([A-Za-z0-9]{22})/);
  if (urlMatch) return urlMatch[1];

  // URI: spotify:artist:{id}
  const uriMatch = urlOrId.match(/^spotify:artist:([A-Za-z0-9]{22})$/);
  if (uriMatch) return uriMatch[1];

  // Bare 22-char alphanumeric ID
  if (/^[A-Za-z0-9]{22}$/.test(urlOrId)) return urlOrId;

  return null;
}

/**
 * Extract a Spotify album or single ID from either a bare ID or a full Spotify URL.
 * e.g. "https://open.spotify.com/album/4dpARuHxo51G3z768sgnrY" → "4dpARuHxo51G3z768sgnrY"
 *
 * Returns null for empty strings, malformed URLs, or values with no recognisable ID.
 */
export function extractSpotifyAlbumId(idOrUrl: string): string | null {
  const s = idOrUrl.trim();
  if (!s) return null;
  // Full URL: extract the segment after "album/"
  const urlMatch = s.match(/album\/([A-Za-z0-9]{22})/);
  if (urlMatch) return urlMatch[1];
  // Bare ID
  if (isValidSpotifyId(s)) return s;
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

  const urlMatch = urlOrId.match(/spotify\.com\/album\/([A-Za-z0-9]{22})/);
  if (urlMatch) return urlMatch[1];

  const uriMatch = urlOrId.match(/^spotify:album:([A-Za-z0-9]{22})$/);
  if (uriMatch) return uriMatch[1];

  if (/^[A-Za-z0-9]{22}$/.test(urlOrId)) return urlOrId;

  return null;
}

/**
 * Return the best available image from a Spotify images array.
 * Prefers the closest to `targetWidth` px, defaulting to the first image.
 */
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

// ─── API functions ────────────────────────────────────────────────────────────

const API = "https://api.spotify.com/v1";

async function spotifyFetch<T>(path: string): Promise<T> {
  const token = await getSpotifyToken();
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    // Next.js extended fetch: cache responses for 1 hour across requests
    next: { revalidate: 3600 },
  } as RequestInit & { next?: { revalidate?: number } });
  if (!res.ok) {
    throw new Error(`Spotify API error ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch a single Spotify artist by their Spotify ID.
 */
export async function getSpotifyArtist(
  artistId: string
): Promise<SpotifyArtist | null> {
  try {
    return await spotifyFetch<SpotifyArtist>(`/artists/${artistId}`);
  } catch {
 * Extract a bare Spotify track ID from either a full Spotify URL or a raw ID.
 *
 * Accepts:
 *   - https://open.spotify.com/track/4aawyAB9vmqN3uQ7FjRGTy
 *   - spotify:track:4aawyAB9vmqN3uQ7FjRGTy
 *   - 4aawyAB9vmqN3uQ7FjRGTy (22-char alphanumeric)
 *
 * Returns null when the value cannot be parsed.
 */
export function extractSpotifyTrackId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  const urlMatch = urlOrId.match(/spotify\.com\/track\/([A-Za-z0-9]{22})/);
  if (urlMatch) return urlMatch[1];

  const uriMatch = urlOrId.match(/^spotify:track:([A-Za-z0-9]{22})$/);
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
 * Search Spotify for artists matching a query string.
 * Returns up to `limit` results (default 5, max 50).
 */
export async function searchSpotifyArtists(
  query: string,
  limit = 5
): Promise<SpotifyArtist[]> {
  const params = new URLSearchParams({
    q: query,
    type: "artist",
    limit: String(Math.min(limit, 50)),
  });
  try {
    const data = await spotifyFetch<{ artists: { items: SpotifyArtist[] } }>(
      `/search?${params}`
    );
    return data.artists.items;
  } catch {
    return [];
  }
}

/**
 * Fetch the top tracks for a Spotify artist in the given market (default "US").
 */
export async function getSpotifyArtistTopTracks(
  artistId: string,
 * Fetch up to 10 top tracks for an artist.
 * Falls back to an empty array on failure.
 */
export async function getSpotifyArtistTopTracks(
  id: string,
  market = "US"
): Promise<SpotifyTrack[]> {
  try {
    const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(
      `/artists/${artistId}/top-tracks?market=${market}`
    );
    return data.tracks;
  } catch {
      `/artists/${id}/top-tracks?market=${market}`
    );
    return data.tracks;
  } catch (err) {
    console.error("[spotify] getSpotifyArtistTopTracks:", err);
    return [];
  }
}

/**
 * Fetch the albums (albums + singles) for a Spotify artist.
 * Returns up to `limit` results (default 10).
 */
export async function getSpotifyArtistAlbums(
  artistId: string,
  limit = 10
): Promise<SpotifyAlbum[]> {
  const params = new URLSearchParams({
    include_groups: "album,single",
    limit: String(Math.min(limit, 50)),
    market: "US",
  });
  try {
    const data = await spotifyFetch<{ items: SpotifyAlbum[] }>(
      `/artists/${artistId}/albums?${params}`
    );
    return data.items;
  } catch {
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
 * Fetch the full album object (including tracklist) for a Spotify album ID.
 * Used by SpotifyReleasePanel on release detail pages.
 */
export async function getSpotifyAlbum(
  albumId: string
): Promise<SpotifyAlbumDetail | null> {
  try {
    return await spotifyFetch<SpotifyAlbumDetail>(`/albums/${albumId}`);
  } catch {
    return null;
  }
}
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

// ─── Audio features ───────────────────────────────────────────────────────────

/**
 * Raw shape of the Spotify audio-features endpoint response.
 * Mirrors SpotifyAudioFeatures in lib/types.ts — kept here as a private
 * internal type so lib/spotify.ts remains import-free of lib/types.ts.
 */
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

/**
 * Fetch audio-feature data for a single Spotify track.
 * Returns null on any failure (missing credentials, bad ID, track not found).
 */
export async function getSpotifyAudioFeatures(
  trackId: string
): Promise<RawAudioFeatures | null> {
  try {
    return await spotifyFetch<RawAudioFeatures>(
      `/audio-features/${trackId}`,
      86400 // cache for 24 h — audio features never change for a track
    );
  } catch (err) {
    console.error("[spotify] getSpotifyAudioFeatures:", err);
    return null;
  }
}

