/**
 * MusicBrainz metadata integration — server-side only.
 *
 * Uses the MusicBrainz JSON web service (v2).
 * No authentication or API key required.
 * Rate limit: 1 req/sec without a key; this module sets a well-formed
 * User-Agent header so MusicBrainz can contact us if needed.
 *
 * Docs: https://musicbrainz.org/doc/MusicBrainz_API
 */

import "server-only";

const MB_BASE = "https://musicbrainz.org/ws/2";

/**
 * User-Agent sent with every request.
 * MusicBrainz requires: "AppName/Version (contact)"
 * https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
 */
const USER_AGENT = "SUMG-Records/1.0 (admin@sumgrecords.com)";

// ─── Response contract ────────────────────────────────────────────────────────

/**
 * A single recording result returned by the MusicBrainz API.
 *
 * Only the fields SUMG cares about are present — the raw MusicBrainz response
 * is much richer; we intentionally narrow it here so callers have a stable
 * contract regardless of MusicBrainz schema evolution.
 */
export interface MusicBrainzRecording {
  /** MusicBrainz Recording MBID (UUID) */
  mbid: string;
  /** Canonical recording title from MusicBrainz */
  title: string;
  /** Duration in milliseconds (may be undefined if MB has no data) */
  durationMs?: number;
  /** Formatted duration string, e.g. "3:42" */
  duration?: string;
  /** The ISRC this recording was fetched with (echoed back for convenience) */
  isrc?: string;
  /** All ISRCs attached to this recording in MusicBrainz */
  isrcs: string[];
  /** First-credit artist name */
  artistName?: string;
  /** MusicBrainz Artist MBID for the first credit */
  artistMbid?: string;
  /** Release(s) this recording appears on */
  releases: MusicBrainzReleaseRef[];
  /** Date of the earliest release, ISO format (YYYY, YYYY-MM, or YYYY-MM-DD) */
  firstReleaseDate?: string;
}

export interface MusicBrainzReleaseRef {
  mbid: string;
  title: string;
  /** YYYY, YYYY-MM, or YYYY-MM-DD */
  releaseDate?: string;
  /** e.g. "Album", "Single", "EP" */
  primaryType?: string;
}

/**
 * The result wrapper returned by every lookup function.
 *
 * On success: `{ found: true, recording: MusicBrainzRecording }`
 * On not-found: `{ found: false }`
 * On network / parse error: `{ found: false, error: string }`
 */
export type MusicBrainzResult =
  | { found: true; recording: MusicBrainzRecording }
  | { found: false; error?: string };

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Shared fetch wrapper — sets headers, handles non-200, returns parsed JSON. */
async function mbFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    // Next.js ISR cache: revalidate every hour — MB data is stable
    next: { revalidate: 3600 },
  });

  if (res.status === 404) {
    return null; // not found — not an error
  }

  if (!res.ok) {
    throw new Error(`MusicBrainz API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Formats milliseconds as "M:SS". */
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRecording(raw: any, isrc?: string): MusicBrainzRecording {
  const artistCredit = raw["artist-credit"]?.[0];
  const releasesRaw: unknown[] = raw.releases ?? [];

  const releases: MusicBrainzReleaseRef[] = releasesRaw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => ({
      mbid: r.id ?? "",
      title: r.title ?? "",
      releaseDate: r.date ?? undefined,
      primaryType: r["release-group"]?.["primary-type"] ?? undefined,
    }))
    .filter((r) => r.mbid);

  const durationMs: number | undefined =
    typeof raw.length === "number" ? raw.length : undefined;

  const firstReleaseDate: string | undefined =
    releases
      .map((r) => r.releaseDate)
      .filter(Boolean)
      .sort()[0] ?? undefined;

  return {
    mbid: raw.id ?? "",
    title: raw.title ?? "",
    durationMs,
    duration: durationMs ? formatDuration(durationMs) : undefined,
    isrc,
    isrcs: raw.isrcs ?? [],
    artistName: artistCredit?.artist?.name ?? artistCredit?.name ?? undefined,
    artistMbid: artistCredit?.artist?.id ?? undefined,
    releases,
    firstReleaseDate,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Looks up a recording by its ISRC code.
 *
 * Uses MusicBrainz `/recording?isrcs=` with `inc=artist-credits+releases+isrcs`.
 *
 * Returns the first result when MusicBrainz returns multiple recordings for the
 * same ISRC (rare, but possible when the same recording is re-issued).
 *
 * Failure paths:
 *   - ISRC not in MusicBrainz → `{ found: false }`
 *   - Network error or non-200 → `{ found: false, error: "..." }`
 *   - Malformed response → `{ found: false, error: "..." }`
 */
export async function lookupByISRC(isrc: string): Promise<MusicBrainzResult> {
  const normalised = isrc.trim().toUpperCase();
  if (!normalised) {
    return { found: false, error: "ISRC is empty" };
  }

  const url =
    `${MB_BASE}/recording` +
    `?isrcs=${encodeURIComponent(normalised)}` +
    `&inc=artist-credits+releases+isrcs` +
    `&fmt=json`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await mbFetch(url)) as any;

    if (!data) return { found: false };

    const recordings: unknown[] = data.recordings ?? [];
    if (recordings.length === 0) return { found: false };

    return { found: true, recording: parseRecording(recordings[0], normalised) };
  } catch (err) {
    return { found: false, error: String(err) };
  }
}

/**
 * Searches for a recording by artist name and song title.
 *
 * Uses MusicBrainz Lucene search: `/recording?query=`.
 * Returns the highest-scoring match (MusicBrainz orders by relevance).
 *
 * Useful when the ISRC is not yet known — e.g. for new catalog entries.
 * Results are less authoritative than an ISRC lookup; verify before saving.
 *
 * Failure paths:
 *   - No results → `{ found: false }`
 *   - Network error → `{ found: false, error: "..." }`
 */
export async function lookupByArtistTitle(
  artistName: string,
  songTitle: string
): Promise<MusicBrainzResult> {
  if (!artistName.trim() || !songTitle.trim()) {
    return { found: false, error: "artistName and songTitle are required" };
  }

  // Lucene query — exact phrase matching via quoted strings
  const query = `recording:"${songTitle.trim()}" AND artist:"${artistName.trim()}"`;

  const url =
    `${MB_BASE}/recording` +
    `?query=${encodeURIComponent(query)}` +
    `&inc=artist-credits+releases+isrcs` +
    `&fmt=json` +
    `&limit=1`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await mbFetch(url)) as any;

    if (!data) return { found: false };

    const recordings: unknown[] = data.recordings ?? [];
    if (recordings.length === 0) return { found: false };

    return { found: true, recording: parseRecording(recordings[0]) };
  } catch (err) {
    return { found: false, error: String(err) };
  }
}
