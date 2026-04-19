"use client";

/**
 * components/admin/DSPLinksPanel.tsx
 *
 * Reusable DSP / streaming link editor for songs and releases.
 * Renders one URL input per platform; only links that exist are rendered on
 * public pages.
 */

import { DSPLinks } from "@/lib/types";
import { FormField } from "@/components/admin/FormField";

const DSP_PLATFORMS: {
  key: keyof DSPLinks;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "spotify",
    label: "Spotify",
    placeholder: "https://open.spotify.com/track/…",
  },
  {
    key: "appleMusic",
    label: "Apple Music",
    placeholder: "https://music.apple.com/…",
  },
  {
    key: "youtubeMusic",
    label: "YouTube Music",
    placeholder: "https://music.youtube.com/…",
  },
  {
    key: "soundcloud",
    label: "SoundCloud",
    placeholder: "https://soundcloud.com/…",
  },
  {
    key: "tidal",
    label: "Tidal",
    placeholder: "https://tidal.com/browse/track/…",
  },
  {
    key: "deezer",
    label: "Deezer",
    placeholder: "https://www.deezer.com/track/…",
  },
];

interface DSPLinksPanelProps {
  value: DSPLinks;
  onChange: (value: DSPLinks) => void;
  disabled?: boolean;
}

export function DSPLinksPanel({ value, onChange, disabled }: DSPLinksPanelProps) {
  function set(key: keyof DSPLinks, url: string) {
    onChange({ ...value, [key]: url || undefined });
  }

  const filledCount = DSP_PLATFORMS.filter((p) => value[p.key]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/25">
          DSP Links
        </p>
        {filledCount > 0 && (
          <span className="text-[10px] tracking-[0.1em] text-green-400/60 font-mono">
            {filledCount}/{DSP_PLATFORMS.length} linked
          </span>
        )}
      </div>

      {DSP_PLATFORMS.map((platform) => (
        <FormField
          key={platform.key}
          type="url"
          label={platform.label}
          value={value[platform.key] ?? ""}
          placeholder={platform.placeholder}
          mono
          onChange={(v) => !disabled && set(platform.key, v)}
        />
      ))}

      {filledCount === 0 && (
        <p className="text-[10px] text-white/20 italic">
          No DSP links set — links will be hidden on the public page.
        </p>
      )}
    </div>
  );
}

/** Renders a row of DSP icon-links for public pages. */
export function DSPButtonGroup({ links }: { links?: DSPLinks }) {
  if (!links) return null;

  const buttons: { key: keyof DSPLinks; label: string; short: string }[] = [
    { key: "spotify", label: "Listen on Spotify", short: "Spotify" },
    { key: "appleMusic", label: "Listen on Apple Music", short: "Apple Music" },
    { key: "youtubeMusic", label: "YouTube Music", short: "YT Music" },
    { key: "soundcloud", label: "SoundCloud", short: "SoundCloud" },
    { key: "tidal", label: "Tidal", short: "Tidal" },
    { key: "deezer", label: "Deezer", short: "Deezer" },
  ];

  const active = buttons.filter((b) => links[b.key]);
  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {active.map((b) => (
        <a
          key={b.key}
          href={links[b.key]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/30 hover:text-white transition-all duration-200"
          aria-label={b.label}
        >
          {b.short}
          <span className="text-white/20">↗</span>
        </a>
      ))}
    </div>
  );
}
