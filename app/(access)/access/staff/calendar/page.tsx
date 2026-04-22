"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useCmsStore } from "@/lib/cms/store";

function monthName(month: number): string {
  return new Date(2024, month, 1).toLocaleString("en-US", { month: "long" });
}

export default function StaffCalendarPage() {
  const { releases } = useCmsStore();

  const upcoming = useMemo(
    () => {
      const now = new Date();
      return [...releases]
        .filter((r) => {
          const d = new Date(r.releaseDate);
          return d >= now || r.status === "scheduled";
        })
        .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
        .slice(0, 20);
    },
    [releases]
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, typeof upcoming>();
    for (const r of upcoming) {
      const d = new Date(r.releaseDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [upcoming]);

  return (
    <AccessShell
      title="Calendar"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Staff", href: "/access/staff" },
        { label: "Calendar" },
      ]}
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Release Calendar</h2>
          <p className="text-[11px] text-white/30 mt-1">
            Upcoming and scheduled releases across all artists.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <div className="border border-white/5 py-16 text-center">
            <p className="text-[12px] text-white/20">No upcoming releases.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {byMonth.map(([key, items]) => {
              const [year, monthNum] = key.split("-");
              const month = monthName(parseInt(monthNum, 10) - 1);
              return (
                <div key={key}>
                  <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">
                    {month} {year}
                  </p>
                  <div className="border border-white/5 divide-y divide-white/[0.04]">
                    {items.map((r) => {
                      const d = new Date(r.releaseDate);
                      const dayOfMonth = d.getDate();
                      const dayName = d.toLocaleString("en-US", { weekday: "short" });
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Date bubble */}
                          <div className="w-10 text-center flex-shrink-0">
                            <p className="text-lg font-black text-white/60 leading-none">{dayOfMonth}</p>
                            <p className="text-[9px] tracking-[0.1em] uppercase text-white/20 mt-0.5">{dayName}</p>
                          </div>

                          {/* Cover art */}
                          <div className="w-8 h-8 bg-white/5 flex-shrink-0 overflow-hidden">
                            {r.coverArtUrl ? (
                              <img src={r.coverArtUrl} alt={r.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-white/15 text-xs">◑</span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-white/65 truncate">{r.title}</p>
                            <p className="text-[9px] text-white/30 mt-0.5">
                              {r.artistName} · {r.type}
                            </p>
                          </div>

                          <span className={`flex-shrink-0 text-[8px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${
                            r.status === "published" ? "border-green-800/40 text-green-400/50"
                            : r.status === "scheduled" ? "border-blue-800/40 text-blue-400/50"
                            : "border-yellow-800/40 text-yellow-400/50"
                          }`}>
                            {r.status}
                          </span>

                          <Link
                            href={`/admin/releases/${r.slug}`}
                            className="flex-shrink-0 text-[9px] uppercase text-white/20 hover:text-white transition-colors"
                          >
                            →
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccessShell>
  );
}
