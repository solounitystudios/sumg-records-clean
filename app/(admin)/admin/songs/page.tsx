"use client";

import { useCmsStore } from "@/lib/cms/store";
import { AdminShell } from "@/components/admin/AdminShell";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  published: "border-green-800/60 text-green-300",
  draft: "border-white/10 text-white/35",
  scheduled: "border-yellow-800/50 text-yellow-300",
  archived: "border-white/5 text-white/20",
};

export default function AdminSongsPage() {
  const { songs } = useCmsStore();

  const sorted = [...songs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const published = songs.filter((s) => s.status === "published").length;
  const draft = songs.filter((s) => s.status === "draft").length;

  return (
    <AdminShell title="Songs">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/20">
              {songs.length} song{songs.length !== 1 ? "s" : ""} total
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-green-300/50">
              {published} published
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/25">
              {draft} draft
            </p>
          </div>
          <Link
            href="/admin/songs/new"
            className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/30 hover:text-white transition-colors"
          >
            + New Song
          </Link>
        </div>

        {/* Table */}
        {sorted.length === 0 ? (
          <div className="border border-white/5 py-20 text-center">
            <p className="text-white/20 text-sm mb-4">No songs yet.</p>
            <Link
              href="/admin/songs/new"
              className="text-[10px] tracking-[0.2em] uppercase text-white/30 hover:text-white transition-colors"
            >
              + Create your first song
            </Link>
          </div>
        ) : (
          <div className="border border-white/5 divide-y divide-white/[0.04]">
            {/* Column headings */}
            <div className="grid grid-cols-12 gap-4 px-5 py-2.5 text-[9px] tracking-[0.2em] uppercase text-white/20">
              <span className="col-span-4">Title</span>
              <span className="col-span-2">Artist</span>
              <span className="col-span-2">Release</span>
              <span className="col-span-1">Genre</span>
              <span className="col-span-1">Duration</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-1" />
            </div>

            {sorted.map((song) => (
              <div
                key={song.id}
                className="grid grid-cols-12 gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors items-center"
              >
                <div className="col-span-4">
                  <p className="text-sm text-white/80 truncate">{song.title}</p>
                  <p className="text-[10px] font-mono text-white/20 truncate">
                    /songs/{song.slug}
                  </p>
                </div>
                <p className="col-span-2 text-xs text-white/40 truncate">
                  {song.artistName}
                </p>
                <p className="col-span-2 text-xs text-white/30 truncate">
                  {song.releaseName ?? "—"}
                </p>
                <p className="col-span-1 text-xs text-white/25 truncate">
                  {song.genre ?? "—"}
                </p>
                <p className="col-span-1 text-[11px] font-mono text-white/25">
                  {song.duration ?? "—"}
                </p>
                <div className="col-span-1">
                  <span
                    className={`border text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 ${
                      STATUS_COLORS[song.status] ?? "border-white/10 text-white/30"
                    }`}
                  >
                    {song.status}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Link
                    href={`/admin/songs/${song.slug}`}
                    className="text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
