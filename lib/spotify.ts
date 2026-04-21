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
  market = "US"
): Promise<SpotifyTrack[]> {
  try {
    const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(
      `/artists/${artistId}/top-tracks?market=${market}`
    );
    return data.tracks;
  } catch {
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
