"use client";

import { useMemo } from "react";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";
import { ArtistTimelineItem } from "@/lib/types";

type VisFilter = "all" | "public" | "team" | "private";

const VIS_COLORS: Record<ArtistTimelineItem["visibility"], string> = {
  public:  "text-green-400/60 border-green-800/40",
  team:    "text-blue-400/60 border-blue-800/40",
  private: "text-white/30 border-white/10",
};

export default function ArtistTimelinePage() {
  const user = useAccessUser();
  const { timelineItems } = useCmsStore();

  const artistSlug = user.artistSlug ?? "";

  const myItems = useMemo(
    () =>
      timelineItems
        .filter((t) => t.artistSlug === artistSlug)
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    [timelineItems, artistSlug]
  );

  return (
    <AccessShell
      title="Timeline"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist", href: "/access/artist" },
        { label: "Timeline" },
      ]}
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Career Timeline</h2>
          <p className="text-[11px] text-white/30 mt-1">
            Your milestones, releases, events, and career moments.
          </p>
        </div>

        {myItems.length === 0 ? (
          <div className="border border-white/5 py-16 text-center">
            <p className="text-[12px] text-white/20">No timeline items yet.</p>
            <p className="text-[10px] text-white/15 mt-2">
              Your label manager can add items from the CMS.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-white/[0.06]" />

            <div className="space-y-6 pl-10">
              {myItems.map((item) => (
                <div key={item.id} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-[2.6rem] top-1 w-2 h-2 rounded-full bg-white/20" />

                  <div className="border border-white/5 p-4 hover:border-white/10 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] tracking-[0.2em] uppercase text-white/25">
                            {item.type.replace("_", " ")}
                          </span>
                          <span
                            className={`text-[8px] tracking-[0.15em] uppercase border px-1 py-0.5 ${VIS_COLORS[item.visibility]}`}
                          >
                            {item.visibility}
                          </span>
                          {item.lyricEngineEligible && (
                            <span className="text-[8px] tracking-[0.1em] uppercase border border-purple-800/40 text-purple-400/50 px-1 py-0.5">
                              Lyric
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-white/70 font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-[10px] text-white/35 mt-1 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] font-mono text-white/30">
                          {item.eventDate.slice(0, 10)}
                        </p>
                        <div className="mt-1">
                          {Array.from({ length: Math.min(item.importance, 5) }).map((_, i) => (
                            <span key={i} className="text-white/20 text-[8px]">◆</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[8px] tracking-[0.1em] uppercase text-white/25 border border-white/[0.06] px-1.5 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AccessShell>
  );
}
