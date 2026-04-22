/**
 * lib/ai/types.ts
 *
 * Shared AI content type definitions.
 * Safe to import from both server and client components.
 */

export type AIContentType =
  | "spotify_bio"
  | "apple_bio"
  | "press_kit"
  | "ig_caption"
  | "rollout_caption"
  | "playlist_pitch"
  | "interview_answer"
  | "branding_copy";

export const AI_CONTENT_TYPES: { value: AIContentType; label: string }[] = [
  { value: "spotify_bio",      label: "Spotify Bio" },
  { value: "apple_bio",        label: "Apple Music Bio" },
  { value: "press_kit",        label: "Press Kit" },
  { value: "ig_caption",       label: "IG Caption" },
  { value: "rollout_caption",  label: "Rollout Caption" },
  { value: "playlist_pitch",   label: "Playlist Pitch" },
  { value: "interview_answer", label: "Interview Answer" },
  { value: "branding_copy",    label: "Branding Copy" },
];
