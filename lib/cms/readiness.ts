/**
 * lib/cms/readiness.ts
 *
 * Release readiness calculation.
 *
 * A "ready" release has everything needed before it can go live:
 *   ✓ primary artist assigned
 *   ✓ at least one song linked
 *   ✓ all linked songs have audio
 *   ✓ at least one producer credited
 *   ✓ cover art attached (coverArtUrl set)
 *   ✓ publish date set
 *
 * Each gap is returned as a separate item so the UI can render a checklist.
 */

import { CMSRelease, CMSSong } from "@/lib/types";

export interface ReadinessItem {
  key: string;
  label: string;
  passed: boolean;
  /** Optional — extra detail shown when the check fails */
  detail?: string;
}

export interface ReleaseReadiness {
  /** 0–100 */
  score: number;
  allPassed: boolean;
  items: ReadinessItem[];
}

export function getReleaseReadiness(
  release: CMSRelease,
  allSongs: CMSSong[]
): ReleaseReadiness {
  const linkedSongs = allSongs.filter((s) => s.releaseSlug === release.slug);
  const songsWithoutAudio = linkedSongs.filter((s) => !s.audioUrl);

  const items: ReadinessItem[] = [
    {
      key: "artist",
      label: "Primary artist assigned",
      passed: Boolean(release.artistSlug),
    },
    {
      key: "cover",
      label: "Cover art uploaded",
      passed: Boolean(release.coverArtUrl),
    },
    {
      key: "songs",
      label: "At least one song linked",
      passed: linkedSongs.length > 0,
      detail:
        linkedSongs.length === 0
          ? "No songs are linked to this release."
          : `${linkedSongs.length} song${linkedSongs.length !== 1 ? "s" : ""} linked.`,
    },
    {
      key: "audio",
      label: "All songs have audio",
      passed: linkedSongs.length > 0 && songsWithoutAudio.length === 0,
      detail:
        songsWithoutAudio.length > 0
          ? (() => {
              const shown = songsWithoutAudio.slice(0, 3);
              const rest = songsWithoutAudio.length - shown.length;
              const names = shown.map((s) => s.title).join(", ");
              return `${songsWithoutAudio.length} song${songsWithoutAudio.length !== 1 ? "s" : ""} missing audio: ${names}${rest > 0 ? ` +${rest} more` : ""}.`;
            })()
          : undefined,
    },
    {
      key: "producers",
      label: "Producer credits added",
      passed: (release.producerSlugs ?? []).length > 0,
    },
    {
      key: "date",
      label: "Publish / release date set",
      passed: Boolean(release.releaseDate || release.publishAt),
    },
  ];

  const passed = items.filter((i) => i.passed).length;
  const score = Math.round((passed / items.length) * 100);

  return {
    score,
    allPassed: passed === items.length,
    items,
  };
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
