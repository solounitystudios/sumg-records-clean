/**
 * lib/cms/timeline.ts
 *
 * Artist timeline helpers and lyric-engine preparation layer.
 *
 * The lyric engine retrieval helpers are pure functions that operate on an
 * array of ArtistTimelineItems already loaded from the store.  They apply
 * the following common rules:
 *   • Only items where lyricEngineEligible = true are returned.
 *   • Results are sorted by importance DESC, then eventDate DESC so the most
 *     significant + recent items surface first.
 *
 * These helpers are intentionally side-effect-free and have no Supabase
 * dependency — the caller loads the items; these functions transform them.
 */

import { ArtistTimelineItem, TimelineItemType } from "@/lib/types";

// ─── Color + display metadata ─────────────────────────────────────────────────

export const TIMELINE_TYPE_META: Record<
  TimelineItemType,
  { label: string; color: string; icon: string }
> = {
  release:         { label: "Release",         color: "#a78bfa", icon: "◑" },
  song:            { label: "Song",             color: "#60a5fa", icon: "♫" },
  video:           { label: "Video",            color: "#f472b6", icon: "▶" },
  event:           { label: "Event",            color: "#34d399", icon: "◎" },
  performance:     { label: "Performance",      color: "#fb923c", icon: "★" },
  milestone:       { label: "Milestone",        color: "#fbbf24", icon: "◆" },
  press:           { label: "Press",            color: "#94a3b8", icon: "◉" },
  relationship:    { label: "Relationship",     color: "#f87171", icon: "◐" },
  career:          { label: "Career",           color: "#4ade80", icon: "◈" },
  creative_note:   { label: "Creative Note",    color: "#e879f9", icon: "✦" },
  story_seed:      { label: "Story Seed",       color: "#c084fc", icon: "⊕" },
  personal_lore:   { label: "Personal Lore",    color: "#67e8f9", icon: "◌" },
  campaign_phase:  { label: "Campaign Phase",   color: "#fde68a", icon: "◒" },
};

// ─── Sorting helpers ──────────────────────────────────────────────────────────

function byImportanceThenDate(
  a: ArtistTimelineItem,
  b: ArtistTimelineItem
): number {
  if (b.importance !== a.importance) return b.importance - a.importance;
  return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
}

function eligibleOnly(items: ArtistTimelineItem[]): ArtistTimelineItem[] {
  return items.filter((i) => i.lyricEngineEligible);
}

// ─── Lyric engine retrieval helpers ──────────────────────────────────────────

/**
 * Returns story-seed and personal-lore items eligible for the lyric engine,
 * sorted by importance then date.
 */
export function getArtistStorySeeds(
  items: ArtistTimelineItem[]
): ArtistTimelineItem[] {
  return eligibleOnly(items)
    .filter((i) => i.type === "story_seed" || i.type === "personal_lore")
    .sort(byImportanceThenDate);
}

/**
 * Returns emotionally-significant items (milestones, relationships, personal
 * lore, career pivots) — highest importance first.
 */
export function getEmotionalMoments(
  items: ArtistTimelineItem[]
): ArtistTimelineItem[] {
  const emotional: TimelineItemType[] = [
    "milestone",
    "relationship",
    "personal_lore",
    "career",
  ];
  return eligibleOnly(items)
    .filter((i) => emotional.includes(i.type))
    .sort(byImportanceThenDate);
}

/**
 * Returns campaign and creative items useful for writing campaign-era lyrics.
 */
export function getCampaignMoments(
  items: ArtistTimelineItem[]
): ArtistTimelineItem[] {
  const campaign: TimelineItemType[] = ["campaign_phase", "creative_note"];
  return eligibleOnly(items)
    .filter((i) => campaign.includes(i.type))
    .sort(byImportanceThenDate);
}

/**
 * Returns the full eligible timeline sorted chronologically (oldest first)
 * then by importance descending within the same date.  Useful for building a
 * narrative arc for the lyric engine.
 */
export function getLoreTimeline(
  items: ArtistTimelineItem[]
): ArtistTimelineItem[] {
  return eligibleOnly(items).sort((a, b) => {
    const dateDiff =
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.importance - a.importance;
  });
}
