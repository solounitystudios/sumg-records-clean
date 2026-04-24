"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type TabKey = "overview" | "artists" | "releases" | "songs" | "imports";

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: "overview",  label: "Overview" },
  { key: "artists",   label: "Artists" },
  { key: "releases",  label: "Releases" },
  { key: "songs",     label: "Songs" },
  { key: "imports",   label: "Imports" },
];

interface Props {
  tabs: Record<TabKey, ReactNode>;
}

export function AppleMusicTabs({ tabs }: Props) {
  const [active, setActive] = useState<TabKey>("overview");

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-white/[0.07] mb-10 overflow-x-auto">
        {TAB_LABELS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            className={`px-5 py-3 text-[11px] uppercase tracking-[0.18em] transition-colors whitespace-nowrap border-b-2 -mb-px ${
              active === key
                ? "text-white border-[#fc3c44]/70"
                : "text-white/30 border-transparent hover:text-white/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {tabs[active]}
    </>
  );
}
