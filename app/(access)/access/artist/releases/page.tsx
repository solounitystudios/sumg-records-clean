"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";
import { CMSRelease } from "@/lib/types";

type FilterStatus = "all" | "published" | "draft" | "scheduled" | "archived";

function ReleaseBadge({ status }: { status: CMSRelease["status"] }) {
  const cls =
    status === "published" ? "border-green-800/40 text-green-400/60"
    : status === "draft" ? "border-yellow-800/40 text-yellow-400/60"
    : status === "scheduled" ? "border-blue-800/40 text-blue-400/60"
    : "border-white/10 text-white/25";
  return (
    <span className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${cls}`}>
      {status}
    </span>
  );
}

export default function ArtistReleasesPage() {
  const user = useAccessUser();
  const { releases } = useCmsStore();
  const [filter, setFilter] = useState<FilterStatus>("all");

  const artistSlug = user.artistSlug ?? "";

  const myReleases = useMemo(
    () =>
      releases
        .filter((r) => r.artistSlug === artistSlug)
        .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
    [releases, artistSlug]
  );

  const filtered = useMemo(
    () => (filter === "all" ? myReleases : myReleases.filter((r) => r.status === filter)),
    [myReleases, filter]
  );

  const filters: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Published", value: "published" },
    { label: "Draft", value: "draft" },
    { label: "Scheduled", value: "scheduled" },
  ];

  return (
    <AccessShell
      title="Releases"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist", href: "/access/artist" },
        { label: "Releases" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {myReleases.length} Release{myReleases.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-[9px] tracking-[0.2em] uppercase px-3 py-1.5 border transition-colors ${
                filter === f.value
                  ? "border-white/20 text-white bg-white/[0.05]"
                  : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="border border-white/5 py-16 text-center">
            <p className="text-[12px] text-white/20">No releases found.</p>
          </div>
        ) : (
          <div className="space-y-px">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/access/artist/releases/${r.slug}`}
                className="flex items-center gap-4 px-4 py-4 border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all"
              >
                {/* Cover art */}
                <div className="w-12 h-12 bg-white/5 flex-shrink-0 overflow-hidden">
                  {r.coverArtUrl ? (
                    <img src={r.coverArtUrl} alt={r.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-white/15 text-lg">◑</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/70 truncate font-medium">{r.title}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {r.type} · {r.releaseDate.slice(0, 10)}
                    {r.tracklist && r.tracklist.length > 0 && ` · ${r.tracklist.length} track${r.tracklist.length !== 1 ? "s" : ""}`}
                  </p>
                </div>

                {/* Distribution status */}
                {r.distributionRecord?.deliveryStatus && (
                  <span className={`hidden sm:block text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 flex-shrink-0 ${
                    r.distributionRecord.deliveryStatus === "live"
                      ? "border-green-800/40 text-green-400/50"
                      : "border-white/10 text-white/25"
                  }`}>
                    {r.distributionRecord.deliveryStatus}
                  </span>
                )}

                <ReleaseBadge status={r.status} />
                <span className="text-white/20 text-sm flex-shrink-0">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AccessShell>
  );
}
