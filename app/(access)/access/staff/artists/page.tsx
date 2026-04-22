"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useCmsStore } from "@/lib/cms/store";

export default function StaffArtistsPage() {
  const { artists, releases, songs } = useCmsStore();
  const [search, setSearch] = useState("");

  const filteredArtists = useMemo(() => {
    const q = search.toLowerCase();
    return artists
      .filter(
        (a) =>
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.genre.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [artists, search]);

  const releaseCountByArtist = useMemo(
    () =>
      new Map(
        artists.map((a) => [a.slug, releases.filter((r) => r.artistSlug === a.slug).length])
      ),
    [artists, releases]
  );

  const songCountByArtist = useMemo(
    () =>
      new Map(
        artists.map((a) => [a.slug, songs.filter((s) => s.artistSlug === a.slug).length])
      ),
    [artists, songs]
  );

  return (
    <AccessShell
      title="Artists"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Staff", href: "/access/staff" },
        { label: "Artists" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {artists.length} Artist{artists.length !== 1 ? "s" : ""}
          </p>
          <Link
            href="/admin/artists/new"
            className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/25 hover:text-white/70 transition-all"
          >
            + New →
          </Link>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search artists…"
          className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-white/25 focus:outline-none transition-colors"
        />

        <div className="border border-white/5 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
              <span className="col-span-3">Name</span>
              <span className="col-span-2">Genre</span>
              <span className="col-span-1">Tier</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-1">Releases</span>
              <span className="col-span-1">Songs</span>
              <span className="col-span-3">Actions</span>
            </div>
            {filteredArtists.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[11px] text-white/20">No artists found.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {filteredArtists.map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                  >
                    <div className="col-span-3 min-w-0 flex items-center gap-2">
                      {a.profileImageUrl && (
                        <img src={a.profileImageUrl} alt={a.name} className="w-6 h-6 object-cover flex-shrink-0" />
                      )}
                      <p className="text-[11px] text-white/65 truncate">{a.name}</p>
                    </div>
                    <p className="col-span-2 text-[10px] text-white/35 truncate">{a.genre}</p>
                    <p className="col-span-1 text-[9px] text-white/30 capitalize">{a.tier}</p>
                    <div className="col-span-1">
                      <span className={`text-[8px] tracking-[0.1em] uppercase border px-1 py-0.5 ${
                        a.status === "active" ? "border-green-800/40 text-green-400/50"
                        : "border-white/10 text-white/25"
                      }`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="col-span-1 text-[10px] text-white/35 font-mono">
                      {releaseCountByArtist.get(a.slug) ?? 0}
                    </p>
                    <p className="col-span-1 text-[10px] text-white/35 font-mono">
                      {songCountByArtist.get(a.slug) ?? 0}
                    </p>
                    <div className="col-span-3 flex gap-3">
                      <Link
                        href={`/admin/artists/${a.slug}`}
                        className="text-[9px] tracking-[0.1em] uppercase text-white/25 hover:text-white transition-colors"
                      >
                        Edit →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AccessShell>
  );
}
