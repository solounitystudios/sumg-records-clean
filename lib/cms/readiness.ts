/**
 * lib/cms/readiness.ts
 *
 * Release readiness calculation — Phase 7 upgrade.
 *
 * Each check has a severity (critical / warning / info) and a weight.
 * Weights sum to 100; the score is the percentage of weight earned.
 *
 * Critical checks must all pass before a release is truly "ready".
 */

import { CMSRelease, CMSSong } from "@/lib/types";

export type ReadinessSeverity = "critical" | "warning" | "info";

export interface ReadinessItem {
  key: string;
  label: string;
  passed: boolean;
  severity: ReadinessSeverity;
  /** Contribution to the total score (weights sum to 100). */
  weight: number;
  /** Optional extra detail shown when the check fails. */
  detail?: string;
}

export interface ReleaseReadiness {
  /** 0–100 weighted score */
  score: number;
  allPassed: boolean;
  /** True when all critical checks pass */
  criticalPassed: boolean;
  items: ReadinessItem[];
}

export interface ReadinessBadge {
  label: string;
  colorClass: string;
}

// ─── Score badge ──────────────────────────────────────────────────────────────

export function getReadinessBadge(score: number): ReadinessBadge {
  if (score === 100)
    return { label: "Ready", colorClass: "text-green-400 border-green-800/50" };
  if (score >= 80)
    return { label: "Almost Ready", colorClass: "text-yellow-400 border-yellow-800/50" };
  if (score >= 50)
    return { label: "Partial", colorClass: "text-orange-400 border-orange-800/50" };
  return { label: "Not Ready", colorClass: "text-red-400 border-red-800/50" };
}

// ─── Main readiness function ──────────────────────────────────────────────────

export function getReleaseReadiness(
  release: CMSRelease,
  allSongs: CMSSong[]
): ReleaseReadiness {
  const linkedSongs = allSongs.filter((s) => s.releaseSlug === release.slug);
  const songsWithoutAudio = linkedSongs.filter((s) => !s.audioUrl);
  const songsWithoutProducers = linkedSongs.filter(
    (s) => (s.producerSlugs ?? []).length === 0
  );

  const dsp = release.dspLinks;
  const hasDSPLinks = Boolean(
    dsp &&
      (dsp.spotify ||
        dsp.appleMusic ||
        dsp.youtubeMusic ||
        dsp.soundcloud ||
        dsp.tidal ||
        dsp.deezer)
  );

  const items: ReadinessItem[] = [
    // ── Critical (must pass) ─────────────────────────────────────────────────
    {
      key: "artist",
      label: "Primary artist assigned",
      passed: Boolean(release.artistSlug),
      severity: "critical",
      weight: 12,
    },
    {
      key: "cover",
      label: "Cover art uploaded",
      passed: Boolean(release.coverArtUrl),
      severity: "critical",
      weight: 12,
    },
    {
      key: "songs",
      label: "At least one song linked",
      passed: linkedSongs.length > 0,
      severity: "critical",
      weight: 12,
      detail:
        linkedSongs.length === 0
          ? "No songs are linked to this release."
          : `${linkedSongs.length} song${linkedSongs.length !== 1 ? "s" : ""} linked.`,
    },
    {
      key: "audio",
      label: "All linked songs have audio",
      passed: linkedSongs.length > 0 && songsWithoutAudio.length === 0,
      severity: "critical",
      weight: 12,
      detail:
        songsWithoutAudio.length > 0
          ? (() => {
              const shown = songsWithoutAudio.slice(0, 3);
              const rest = songsWithoutAudio.length - shown.length;
              return `${songsWithoutAudio.length} song${songsWithoutAudio.length !== 1 ? "s" : ""} missing audio: ${shown.map((s) => s.title).join(", ")}${rest > 0 ? ` +${rest} more` : ""}.`;
            })()
          : undefined,
    },

    // ── Warning (important but not blocking) ─────────────────────────────────
    {
      key: "producers",
      label: "Producer credits added",
      passed: (release.producerSlugs ?? []).length > 0,
      severity: "warning",
      weight: 10,
    },
    {
      key: "date",
      label: "Publish / release date set",
      passed: Boolean(release.releaseDate || release.publishAt),
      severity: "warning",
      weight: 10,
    },
    {
      key: "description",
      label: "Public description written",
      passed: (release.description ?? "").trim().length >= 20,
      severity: "warning",
      weight: 8,
      detail:
        (release.description ?? "").trim().length < 20
          ? "Description should be at least 20 characters."
          : undefined,
    },
    {
      key: "visibility",
      label: "Visibility enabled",
      passed: release.isVisible,
      severity: "warning",
      weight: 8,
    },

    // ── Info (nice-to-have) ───────────────────────────────────────────────────
    {
      key: "song_producers",
      label: "All songs have producer credits",
      passed: linkedSongs.length > 0 && songsWithoutProducers.length === 0,
      severity: "info",
      weight: 6,
      detail:
        songsWithoutProducers.length > 0
          ? `${songsWithoutProducers.length} song${songsWithoutProducers.length !== 1 ? "s" : ""} without producer credits.`
          : undefined,
    },
    {
      key: "dsp",
      label: "Streaming / DSP links present",
      passed: hasDSPLinks,
      severity: "info",
      weight: 5,
    },
    {
      key: "status",
      label: "Release status is valid",
      passed: ["draft", "scheduled", "published", "archived"].includes(
        release.status
      ),
      severity: "info",
      weight: 5,
    },
  ];

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const earnedWeight = items
    .filter((i) => i.passed)
    .reduce((sum, i) => sum + i.weight, 0);
  const score =
    totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  const allPassed = items.every((i) => i.passed);
  const criticalPassed = items
    .filter((i) => i.severity === "critical")
    .every((i) => i.passed);

  return { score, allPassed, criticalPassed, items };
}

/**
 * Quick variant that just returns the score (0–100).
 * Useful for list-page badges.
 */
export function getReadinessScore(
  release: CMSRelease,
  allSongs: CMSSong[]
): number {
  return getReleaseReadiness(release, allSongs).score;
}
