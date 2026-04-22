"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

export default function ArtistSongsPage() {
  const user = useAccessUser();
  const { songs } = useCmsStore();
  const [search, setSearch] = useState("");

  const artistSlug = user.artistSlug ?? "";

  const mySongs = useMemo(
    () =>
      songs
        .filter((s) => s.artistSlug === artistSlug)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [songs, artistSlug]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return mySongs;
    const q = search.toLowerCase();
    return mySongs.filter(
      (s) => s.title.toLowerCase().includes(q) || (s.releaseName ?? "").toLowerCase().includes(q)
    );
  }, [mySongs, search]);

  const withISRC = mySongs.filter((s) => s.isrc).length;

  return (
    <AccessShell
      title="Songs"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist", href: "/access/artist" },
        { label: "Songs" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-px bg-white/5">
          <div className="bg-black px-4 py-3">
            <p className="text-xl font-black text-white">{mySongs.length}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-0.5">Total</p>
          </div>
          <div className="bg-black px-4 py-3">
            <p className="text-xl font-black text-green-400/80">{withISRC}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-0.5">With ISRC</p>
          </div>
          <div className="bg-black px-4 py-3">
            <p className={`text-xl font-black ${mySongs.length - withISRC > 0 ? "text-yellow-400/70" : "text-white/30"}`}>
              {mySongs.length - withISRC}
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-0.5">Missing ISRC</p>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs…"
          className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-white/25 focus:outline-none transition-colors"
        />

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="border border-white/5 py-16 text-center">
            <p className="text-[12px] text-white/20">
              {mySongs.length === 0 ? "No songs yet." : "No songs match your search."}
            </p>
          </div>
        ) : (
          <div className="border border-white/5">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
              <span className="col-span-4">Title</span>
              <span className="col-span-2">Release</span>
              <span className="col-span-2">ISRC</span>
              <span className="col-span-2">Duration</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-1" />
            </div>
            <div className="divide-y divide-white/[0.03]">
              {filtered.map((s) => (
                <Link
                  key={s.id}
                  href={`/access/artist/songs/${s.slug}`}
                  className="flex sm:grid sm:grid-cols-12 gap-2 sm:gap-2 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Mobile: simple row */}
                  <div className="sm:hidden flex-1 min-w-0">
                    <p className="text-[11px] text-white/65 truncate">{s.title}</p>
                    <p className="text-[9px] text-white/25 mt-0.5">
                      {s.releaseName ?? "—"} · {s.isrc ?? "No ISRC"}
                    </p>
                  </div>
                  {/* Desktop */}
                  <p className="hidden sm:block col-span-4 text-[11px] text-white/65 truncate">{s.title}</p>
                  <p className="hidden sm:block col-span-2 text-[10px] text-white/35 truncate">{s.releaseName ?? "—"}</p>
                  <p className={`hidden sm:block col-span-2 text-[9px] font-mono ${s.isrc ? "text-white/40" : "text-red-400/40"}`}>
                    {s.isrc ?? "—"}
                  </p>
                  <p className="hidden sm:block col-span-2 text-[10px] text-white/30 font-mono">{s.duration ?? "—"}</p>
                  <div className="hidden sm:block col-span-1">
                    <span className={`text-[9px] tracking-[0.1em] uppercase border px-1 py-0.5 ${
                      s.status === "published" ? "border-green-800/40 text-green-400/50"
                      : s.status === "draft" ? "border-yellow-800/40 text-yellow-400/50"
                      : "border-white/10 text-white/25"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <span className="text-white/20 text-xs flex-shrink-0 sm:col-span-1 sm:text-right">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AccessShell>
  );
}
