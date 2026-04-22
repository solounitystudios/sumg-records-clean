"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useCmsStore } from "@/lib/cms/store";
import { CMSRelease } from "@/lib/types";

type StatusFilter = "all" | CMSRelease["status"];

export default function StaffReleasesPage() {
  const { releases, artists } = useCmsStore();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = releases;
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.artistName.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [releases, filter, search]);

  const counts: Record<StatusFilter, number> = useMemo(
    () => ({
      all: releases.length,
      published: releases.filter((r) => r.status === "published").length,
      draft: releases.filter((r) => r.status === "draft").length,
      scheduled: releases.filter((r) => r.status === "scheduled").length,
      archived: releases.filter((r) => r.status === "archived").length,
    }),
    [releases]
  );

  const artistMap = useMemo(
    () => new Map(artists.map((a) => [a.slug, a])),
    [artists]
  );

  const filters: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Published", value: "published" },
    { label: "Draft", value: "draft" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Archived", value: "archived" },
  ];

  return (
    <AccessShell
      title="Releases"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Staff", href: "/access/staff" },
        { label: "Releases" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {filtered.length} of {releases.length} Release{releases.length !== 1 ? "s" : ""}
          </p>
          <Link
            href="/admin/releases/new"
            className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/25 hover:text-white/70 transition-all"
          >
            + New →
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors ${
                filter === f.value
                  ? "border-white/20 text-white bg-white/[0.05]"
                  : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/50"
              }`}
            >
              {f.label} <span className="text-white/20 ml-1">{counts[f.value]}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or artist…"
          className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-white/25 focus:outline-none transition-colors"
        />

        {/* Table */}
        <div className="border border-white/5 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
              <span className="col-span-4">Title</span>
              <span className="col-span-2">Artist</span>
              <span className="col-span-1">Type</span>
              <span className="col-span-2">Date</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-2">Actions</span>
            </div>
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[11px] text-white/20">No releases found.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {filtered.map((r) => {
                  const artist = artistMap.get(r.artistSlug);
                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                    >
                      <div className="col-span-4 min-w-0 flex items-center gap-2">
                        {r.coverArtUrl && (
                          <img src={r.coverArtUrl} alt={r.title} className="w-7 h-7 object-cover flex-shrink-0" />
                        )}
                        <p className="text-[11px] text-white/65 truncate">{r.title}</p>
                      </div>
                      <div className="col-span-2 min-w-0 flex items-center gap-1.5">
                        {artist?.profileImageUrl && (
                          <img src={artist.profileImageUrl} alt={artist.name} className="w-4 h-4 object-cover flex-shrink-0 opacity-60" />
                        )}
                        <p className="text-[10px] text-white/40 truncate">{r.artistName}</p>
                      </div>
                      <p className="col-span-1 text-[9px] text-white/30">{r.type}</p>
                      <p className="col-span-2 text-[9px] font-mono text-white/30">{r.releaseDate.slice(0, 10)}</p>
                      <div className="col-span-1">
                        <span className={`text-[8px] tracking-[0.1em] uppercase border px-1 py-0.5 ${
                          r.status === "published" ? "border-green-800/40 text-green-400/50"
                          : r.status === "draft" ? "border-yellow-800/40 text-yellow-400/50"
                          : r.status === "scheduled" ? "border-blue-800/40 text-blue-400/50"
                          : "border-white/10 text-white/25"
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="col-span-2 flex gap-3">
                        <Link
                          href={`/admin/releases/${r.slug}`}
                          className="text-[9px] tracking-[0.1em] uppercase text-white/25 hover:text-white transition-colors"
                        >
                          Edit →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AccessShell>
  );
}
