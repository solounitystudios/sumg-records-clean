import "server-only";
import { createSign } from "node:crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppleMusicArtwork {
  url: string;
  width: number;
  height: number;
}

export interface AppleMusicArtist {
  id: string;
  type: "artists";
  href: string;
  attributes: {
    name: string;
    genreNames: string[];
    url: string;
    artwork?: AppleMusicArtwork;
    editorialNotes?: { short?: string; standard?: string };
  };
}

export interface AppleMusicAlbum {
  id: string;
  type: "albums";
  href: string;
  attributes: {
    name: string;
    artistName: string;
    genreNames: string[];
    releaseDate: string;
    trackCount: number;
    url: string;
    artwork?: AppleMusicArtwork;
    contentRating?: string;
    recordLabel?: string;
  };
}

export interface AppleMusicSong {
  id: string;
  type: "songs";
  href: string;
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    genreNames: string[];
    durationInMillis: number;
    releaseDate: string;
    url: string;
    artwork?: AppleMusicArtwork;
    contentRating?: string;
    isrc?: string;
    trackNumber?: number;
    previews?: Array<{ url: string }>;
  };
}

export interface AppleMusicSearchResult {
  results: {
    artists?: { data: AppleMusicArtist[] };
    albums?: { data: AppleMusicAlbum[] };
    songs?: { data: AppleMusicSong[] };
  };
}

// ─── Developer token (cached) ────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

let _tokenCache: TokenCache | null = null;

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateDeveloperToken(): string {
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const rawKey = process.env.APPLE_MUSIC_PRIVATE_KEY;

  if (!keyId || !teamId || !rawKey) {
    throw new Error("[apple-music] Missing APPLE_MUSIC_KEY_ID, APPLE_MUSIC_TEAM_ID, or APPLE_MUSIC_PRIVATE_KEY");
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15_552_000; // 6 months

  const header = base64url(Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })));
  const payload = base64url(Buffer.from(JSON.stringify({ iss: teamId, iat: now, exp })));
  const unsigned = `${header}.${payload}`;

  const sign = createSign("SHA256");
  sign.update(unsigned);
  const sig = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });

  return `${unsigned}.${base64url(sig)}`;
}

function getToken(): string {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }
  const token = generateDeveloperToken();
  // Cache for 23 hours (well under the 6-month expiry)
  _tokenCache = { token, expiresAt: now + 82_800_000 };
  return token;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

const APPLE_MUSIC_API = "https://api.music.apple.com/v1";

async function appleFetch<T>(path: string, revalidate = 3600): Promise<T> {
  const token = getToken();
  const res = await fetch(`${APPLE_MUSIC_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`[apple-music] ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function artworkUrl(artwork: AppleMusicArtwork | undefined, size = 400): string | null {
  if (!artwork) return null;
  return artwork.url.replace("{w}", String(size)).replace("{h}", String(size));
}

export function extractAppleMusicArtistId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const match = urlOrId.match(/music\.apple\.com\/[a-z]{2}\/artist\/[^/]+\/(\d+)/);
  if (match) return match[1];
  if (/^\d+$/.test(urlOrId)) return urlOrId;
  return null;
}

export function extractAppleMusicAlbumId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const match = urlOrId.match(/music\.apple\.com\/[a-z]{2}\/album\/[^/]+\/(\d+)/);
  if (match) return match[1];
  if (/^\d+$/.test(urlOrId)) return urlOrId;
  return null;
}

export function extractAppleMusicSongId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  // Song ID is in the ?i= param for album URLs
  const iMatch = urlOrId.match(/[?&]i=(\d+)/);
  if (iMatch) return iMatch[1];
  const match = urlOrId.match(/music\.apple\.com\/[a-z]{2}\/song\/[^/]+\/(\d+)/);
  if (match) return match[1];
  if (/^\d+$/.test(urlOrId)) return urlOrId;
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchAppleMusic(
  query: string,
  types: Array<"artists" | "albums" | "songs"> = ["artists"],
  storefront = "us",
  limit = 10
): Promise<AppleMusicSearchResult> {
  try {
    const params = new URLSearchParams({
      term: query,
      types: types.join(","),
      limit: String(Math.min(limit, 25)),
    });
    return await appleFetch<AppleMusicSearchResult>(
      `/catalog/${storefront}/search?${params}`,
      300
    );
  } catch (err) {
    console.error("[apple-music] searchAppleMusic:", err);
    return { results: {} };
  }
}

export async function getAppleMusicArtist(
  id: string,
  storefront = "us"
): Promise<AppleMusicArtist | null> {
  try {
    const data = await appleFetch<{ data: AppleMusicArtist[] }>(
      `/catalog/${storefront}/artists/${id}`
    );
    return data.data[0] ?? null;
  } catch (err) {
    console.error("[apple-music] getAppleMusicArtist:", err);
    return null;
  }
}

export async function getAppleMusicAlbum(
  id: string,
  storefront = "us"
): Promise<AppleMusicAlbum | null> {
  try {
    const data = await appleFetch<{ data: AppleMusicAlbum[] }>(
      `/catalog/${storefront}/albums/${id}`
    );
    return data.data[0] ?? null;
  } catch (err) {
    console.error("[apple-music] getAppleMusicAlbum:", err);
    return null;
  }
}

export async function getAppleMusicSong(
  id: string,
  storefront = "us"
): Promise<AppleMusicSong | null> {
  try {
    const data = await appleFetch<{ data: AppleMusicSong[] }>(
      `/catalog/${storefront}/songs/${id}`
    );
    return data.data[0] ?? null;
  } catch (err) {
    console.error("[apple-music] getAppleMusicSong:", err);
    return null;
  }
}

export function isAppleMusicConfigured(): boolean {
  return !!(
    process.env.APPLE_MUSIC_KEY_ID &&
    process.env.APPLE_MUSIC_TEAM_ID &&
    process.env.APPLE_MUSIC_PRIVATE_KEY
  );
}
