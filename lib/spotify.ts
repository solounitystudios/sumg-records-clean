/**
 * Spotify Web API — Client Credentials helper.
 *
 * Uses the Client Credentials OAuth flow (server-side only — no user login).
 * Tokens are cached in memory for their full 3,600-second lifetime so that
 * concurrent requests within a single server process share one token.
 *
 * Required env vars (server-side only — never expose to the browser):
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 */

export interface SpotifyArtistData {
  id: string;
  name: string;
  followers: number;
  /** Spotify popularity score 0–100 */
  popularity: number;
  genres: string[];
  imageUrl?: string;
  spotifyUrl: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  popularity: number;
  albumName: string;
  albumImageUrl?: string;
  previewUrl?: string;
  spotifyUrl: string;
}

// ─── Token cache ─────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

let _tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set as server-side env vars."
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    // Next.js fetch — disable caching so token refresh always hits Spotify
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  _tokenCache = {
    token: json.access_token as string,
    expiresAt: now + (json.expires_in as number) * 1000,
  };
  return _tokenCache.token;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Fetches artist profile data by Spotify artist ID.
 * Throws if Spotify credentials are not configured.
 */
export async function getSpotifyArtist(
  spotifyId: string
): Promise<SpotifyArtistData> {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Spotify artist fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    followers: data.followers?.total ?? 0,
    popularity: data.popularity ?? 0,
    genres: data.genres ?? [],
    imageUrl: data.images?.[0]?.url ?? undefined,
    spotifyUrl: data.external_urls?.spotify ?? "",
  };
}

/**
 * Fetches an artist's top tracks (up to 10) for a given market.
 */
export async function getSpotifyTopTracks(
  spotifyId: string,
  market = "US"
): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=${market}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    throw new Error(`Spotify top-tracks fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.tracks ?? []).map((t: any): SpotifyTrack => ({
    id: t.id,
    name: t.name,
    popularity: t.popularity ?? 0,
    albumName: t.album?.name ?? "",
    albumImageUrl: t.album?.images?.[0]?.url ?? undefined,
    previewUrl: t.preview_url ?? undefined,
    spotifyUrl: t.external_urls?.spotify ?? "",
  }));
}

/**
 * Searches Spotify for an artist by name and returns the best match's ID.
 * Returns undefined if no result found.
 */
export async function searchSpotifyArtist(
  name: string
): Promise<string | undefined> {
  const token = await getAccessToken();
  const q = encodeURIComponent(name);
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=artist&limit=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 86400 },
    }
  );

  if (!res.ok) return undefined;

  const data = await res.json();
  return data.artists?.items?.[0]?.id ?? undefined;
}

/** Returns true when Spotify credentials are configured. */
export function isSpotifyConfigured(): boolean {
  return (
    typeof process.env.SPOTIFY_CLIENT_ID === "string" &&
    process.env.SPOTIFY_CLIENT_ID.length > 0 &&
    typeof process.env.SPOTIFY_CLIENT_SECRET === "string" &&
    process.env.SPOTIFY_CLIENT_SECRET.length > 0
  );
}
