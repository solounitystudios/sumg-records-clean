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
 * On success:   `{ found: true,        recording: MusicBrainzRecording }`
 * On ambiguous: `{ found: "ambiguous", candidates: MusicBrainzRecording[], reason: string }`
 * On not-found: `{ found: false }`
 * On error:     `{ found: false, error: string }`
 *
 * Callers must handle all three discriminants — the `"ambiguous"` arm means a
 * plausible match was found but confidence is insufficient to write without
 * human review.
 */
export type MusicBrainzResult =
  | { found: true; recording: MusicBrainzRecording }
  | { found: "ambiguous"; candidates: MusicBrainzRecording[]; reason: string }
  | { found: false; error?: string };

/**
 * Options accepted by every public lookup function.
 *
 * `noCache`     — bypass Next.js ISR cache; always use for admin/enrichment
 *                 calls so a previous not-found result is not replayed.
 * `titleHint`   — candidate title used to disambiguate when multiple recordings
 *                 are returned for the same ISRC.
 * `artistHint`  — candidate artist name used alongside `titleHint`.
 */
export interface MBLookupOptions {
  noCache?: boolean;
  titleHint?: string;
  artistHint?: string;
}

// ─── Normalisation utilities ──────────────────────────────────────────────────

/**
 * Normalises an ISRC string: strips surrounding whitespace, uppercases,
 * removes hyphens, and validates the canonical 12-character format
 * (CC-XXX-YY-NNNNN without dashes: two letters, three alphanumerics, seven digits).
 *
 * Returns `null` if the input cannot be coerced into a valid ISRC.
 * Handles both the canonical form (USUM71234567) and the print form (US-UM7-12-34567).
 */
export function normalizeISRC(s: string): string | null {
  const stripped = s.trim().toUpperCase().replace(/-/g, "");
  if (!/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/.test(stripped)) return null;
  return stripped;
}

/**
 * Normalises a freeform text string for comparison: lowercases, strips
 * non-word/non-space characters, and collapses runs of whitespace.
 *
 * Used to compare song titles and artist names across sources that may differ
 * in punctuation, capitalisation, or Unicode presentation.
 */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escapes double-quote characters for use inside a Lucene phrase query. */
function escapeForLucene(s: string): string {
  return s.replace(/"/g, '\\"');
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Shared fetch wrapper — sets headers, handles non-200, returns parsed JSON.
 *
 * Pass `noCache = true` for admin/enrichment paths so stale not-found results
 * are not served from the Next.js ISR cache for up to an hour.
 */
async function mbFetch(url: string, noCache = false): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    ...(noCache
      ? { cache: "no-store" as const }
      : { next: { revalidate: 3600 } }),
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

// ─── Confidence thresholds ────────────────────────────────────────────────────

/** Minimum MusicBrainz search score (0–100) to consider a result at all. */
const MB_SCORE_MIN = 80;

/**
 * Minimum score gap between the top two results for the top result to be
 * considered a clear, unambiguous winner.
 */
const MB_SCORE_GAP_MIN = 10;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Looks up a recording by its ISRC code.
 *
 * Normalises the ISRC (strips hyphens, validates format) before querying.
 * Uses MusicBrainz `/recording?isrcs=` with `inc=artist-credits+releases+isrcs`.
 *
 * When MusicBrainz maps a single ISRC to multiple recordings (a remaster, live
 * reissue, or re-recording), the function attempts to pick the best match using
 * `titleHint` / `artistHint` from `options`.  If no clear winner can be
 * determined it returns `{ found: "ambiguous" }` rather than auto-selecting.
 *
 * Failure paths:
 *   - Invalid ISRC format         → `{ found: false, error: "..." }`
 *   - ISRC not in MusicBrainz    → `{ found: false }`
 *   - Multiple ambiguous matches  → `{ found: "ambiguous", candidates, reason }`
 *   - Network error or non-200   → `{ found: false, error: "..." }`
 */
export async function lookupByISRC(
  isrc: string,
  options: MBLookupOptions = {}
): Promise<MusicBrainzResult> {
  const normalised = normalizeISRC(isrc);
  if (!normalised) {
    return { found: false, error: `Invalid ISRC format: "${isrc}"` };
  }

  const url =
    `${MB_BASE}/recording` +
    `?isrcs=${encodeURIComponent(normalised)}` +
    `&inc=artist-credits+releases+isrcs` +
    `&fmt=json`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await mbFetch(url, options.noCache)) as any;

    if (!data) return { found: false };

    const recordings: unknown[] = data.recordings ?? [];
    if (recordings.length === 0) return { found: false };

    // Single result — unambiguous.
    if (recordings.length === 1) {
      return { found: true, recording: parseRecording(recordings[0], normalised) };
    }

    // Multiple recordings share this ISRC.  Try to pick the best match using
    // the caller-supplied title/artist hints.
    const parsed = recordings.map((r) => parseRecording(r as never, normalised));

    if (options.titleHint) {
      const normTitle = normalizeText(options.titleHint);
      const normArtist = options.artistHint
        ? normalizeText(options.artistHint)
        : null;

      const exact = parsed.filter((rec) => {
        const titleMatch = normalizeText(rec.title) === normTitle;
        const artistMatch = normArtist
          ? rec.artistName !== undefined &&
            normalizeText(rec.artistName) === normArtist
          : true;
        return titleMatch && artistMatch;
      });

      if (exact.length === 1) {
        return { found: true, recording: exact[0] };
      }
    }

    // Cannot determine a clear winner — surface candidates for human review.
    return {
      found: "ambiguous",
      candidates: parsed,
      reason: `ISRC ${normalised} maps to ${recordings.length} recordings`,
    };
  } catch (err) {
    return { found: false, error: String(err) };
  }
}

/**
 * Searches for a recording by artist name and song title.
 *
 * Uses MusicBrainz Lucene search: `/recording?query=`.
 * Fetches up to three candidates and applies confidence checks before
 * committing to a single result:
 *
 *   1. Score threshold: the top result must score ≥ 80/100.
 *   2. Normalised exact match: both title and artist must match after
 *      lowercasing and stripping punctuation.
 *   3. Gap check: the score gap between the top two results must exceed
 *      10 points — a narrow gap means multiple plausible candidates.
 *
 * If all three conditions are met, returns `{ found: true }`.
 * If the score threshold is met but the match or gap checks fail, returns
 * `{ found: "ambiguous" }` with the candidate list for human review.
 *
 * Results are less authoritative than an ISRC lookup — never auto-write ISRC
 * from this path.
 *
 * Failure paths:
 *   - No results / score too low  → `{ found: false }`
 *   - Low-confidence match        → `{ found: "ambiguous", candidates, reason }`
 *   - Network error               → `{ found: false, error: "..." }`
 */
export async function lookupByArtistTitle(
  artistName: string,
  songTitle: string,
  options: MBLookupOptions = {}
): Promise<MusicBrainzResult> {
  if (!artistName.trim() || !songTitle.trim()) {
    return { found: false, error: "artistName and songTitle are required" };
  }

  // Lucene query — exact phrase matching with special-char escaping
  const query =
    `recording:"${escapeForLucene(songTitle.trim())}"` +
    ` AND artist:"${escapeForLucene(artistName.trim())}"`;

  const url =
    `${MB_BASE}/recording` +
    `?query=${encodeURIComponent(query)}` +
    `&inc=artist-credits+releases+isrcs` +
    `&fmt=json` +
    `&limit=3`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await mbFetch(url, options.noCache)) as any;

    if (!data) return { found: false };

    const rawRecordings: unknown[] = data.recordings ?? [];
    if (rawRecordings.length === 0) return { found: false };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const score0: number = (rawRecordings[0] as any).score ?? 0;

    // Reject results below the minimum credibility threshold.
    if (score0 < MB_SCORE_MIN) return { found: false };

    const top = parseRecording(rawRecordings[0]);

    // Normalised exact-match check — title AND artist must both match.
    const normTitle = normalizeText(songTitle);
    const normArtist = normalizeText(artistName);
    const titleMatch = normalizeText(top.title) === normTitle;
    const artistMatch =
      top.artistName !== undefined &&
      normalizeText(top.artistName) === normArtist;
    const normalizedMatch = titleMatch && artistMatch;

    // Gap check — the top result must be a clear winner over the second.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const score1: number =
      rawRecordings.length > 1 ? ((rawRecordings[1] as any).score ?? 0) : 0;
    const clearWinner = score0 - score1 > MB_SCORE_GAP_MIN;

    if (normalizedMatch && clearWinner) {
      return { found: true, recording: top };
    }

    // Score is adequate but the match is not clean enough to auto-write.
    const candidates = rawRecordings.map((r) => parseRecording(r));
    const reason = !normalizedMatch
      ? "Title or artist did not match exactly after normalisation"
      : `Score gap too small (${score0} vs ${score1}) — multiple plausible matches`;

    return { found: "ambiguous", candidates, reason };
  } catch (err) {
    return { found: false, error: String(err) };
  }
}
