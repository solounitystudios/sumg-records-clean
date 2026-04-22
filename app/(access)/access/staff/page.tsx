"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useCmsStore } from "@/lib/cms/store";

export default function StaffOverviewPage() {
  const { artists, releases, songs, brands } = useCmsStore();

  const publishedReleases = releases.filter((r) => r.status === "published");
  const draftReleases = releases.filter((r) => r.status === "draft");
  const scheduledReleases = releases.filter((r) => r.status === "scheduled");
  const missingISRC = songs.filter((s) => s.status !== "archived" && !s.isrc);
  const liveOnDSP = releases.filter((r) => r.distributionRecord?.deliveryStatus === "live");

  const recentReleases = [...releases]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return (
    <AccessShell
      title="Staff Overview"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Staff" },
      ]}
    >
      <div className="space-y-10">
        <div>
          <p className="text-[9px] tracking-[0.4em] uppercase text-white/20 mb-2">Staff Portal</p>
          <h2 className="text-2xl font-black tracking-tight text-white">Catalog Overview</h2>
          <p className="text-[11px] text-white/30 mt-1">
            {artists.length} artists · {releases.length} releases · {songs.length} songs · {brands.length} brands
          </p>
        </div>

        {/* Health stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-white/5">
          {[
            { label: "Published", value: publishedReleases.length, color: "text-green-400" },
            { label: "Drafts", value: draftReleases.length, color: draftReleases.length > 0 ? "text-yellow-400/80" : "text-white/50" },
            { label: "Scheduled", value: scheduledReleases.length, color: "text-blue-400/80" },
            { label: "Live on DSPs", value: liveOnDSP.length, color: liveOnDSP.length > 0 ? "text-green-400" : "text-white/40" },
            { label: "Missing ISRC", value: missingISRC.length, color: missingISRC.length > 0 ? "text-red-400/70" : "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="bg-black px-4 py-4">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] tracking-[0.15em] uppercase text-white/25 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent releases */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] tracking-[0.35em] uppercase text-white/20">Recent Activity</p>
              <Link href="/access/staff/releases" className="text-[9px] tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors">
                All Releases →
              </Link>
            </div>
            <div className="border border-white/5 divide-y divide-white/[0.04]">
              {recentReleases.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/60 truncate">{r.title}</p>
                    <p className="text-[9px] text-white/25 mt-0.5">{r.artistName}</p>
                  </div>
                  <span className={`flex-shrink-0 ml-3 text-[8px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${
                    r.status === "published" ? "border-green-800/40 text-green-400/50"
                    : r.status === "draft" ? "border-yellow-800/40 text-yellow-400/50"
                    : r.status === "scheduled" ? "border-blue-800/40 text-blue-400/50"
                    : "border-white/10 text-white/25"
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Staff tools */}
          <div>
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-4">Staff Tools</p>
            <div className="grid grid-cols-2 gap-px bg-white/5">
              {[
                { label: "Artists", href: "/access/staff/artists", icon: "◎", count: artists.length },
                { label: "Releases", href: "/access/staff/releases", icon: "◑", count: releases.length },
                { label: "Publishing", href: "/access/staff/publishing", icon: "◙", count: `${missingISRC.length} missing` },
                { label: "Royalties", href: "/access/staff/royalties", icon: "◎", count: songs.length },
                { label: "Distribution", href: "/access/staff/distribution", icon: "▤", count: `${liveOnDSP.length} live` },
                { label: "Calendar", href: "/access/staff/calendar", icon: "◫", count: scheduledReleases.length },
              ].map((tool) => (
                <Link key={tool.href} href={tool.href} className="bg-black flex items-start gap-3 px-4 py-4 hover:bg-white/[0.03] transition-colors">
                  <span className="text-base text-white/25 mt-0.5 flex-shrink-0">{tool.icon}</span>
                  <div>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/40">{tool.label}</p>
                    <p className="text-[9px] text-white/20 mt-0.5">{tool.count}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/admin" className="flex items-center justify-between border border-white/10 px-4 py-3 hover:border-white/20 hover:bg-white/[0.02] transition-all">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">Open CMS</p>
                <span className="text-white/20 text-sm">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AccessShell>
  );
}
