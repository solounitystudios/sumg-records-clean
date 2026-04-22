"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useCmsStore } from "@/lib/cms/store";

type SoundExchangeStatus = "registered" | "pending" | "not_registered" | undefined;

function sxStatusColor(status: SoundExchangeStatus): string {
  if (status === "registered") return "border-green-800/40 text-green-400/60";
  if (status === "pending") return "border-yellow-800/40 text-yellow-400/60";
  if (status === "not_registered") return "border-red-800/40 text-red-400/40";
  return "border-white/10 text-white/25";
}

function sxStatusLabel(status: SoundExchangeStatus): string {
  if (status === "registered") return "Registered";
  if (status === "pending") return "Pending";
  if (status === "not_registered") return "Not Registered";
  return "Unset";
}

export default function StaffPublishingPage() {
  const { songs, artists } = useCmsStore();

  const artistMap = useMemo(
    () => new Map(artists.map((a) => [a.slug, a])),
    [artists]
  );

  const activeSongs = useMemo(
    () => songs.filter((s) => s.status !== "archived"),
    [songs]
  );

  const rows = useMemo(
    () =>
      activeSongs.map((song) => {
        const artist = artistMap.get(song.artistSlug);
        const sxStatus: SoundExchangeStatus =
          artist?.providerConfig?.soundExchangeStatus ?? undefined;
        return { song, sxStatus, artist };
      }),
    [activeSongs, artistMap]
  );

  const registeredCnt = rows.filter((r) => r.sxStatus === "registered").length;
  const pendingCnt = rows.filter((r) => r.sxStatus === "pending").length;
  const notRegisteredCnt = rows.filter((r) => !r.sxStatus || r.sxStatus === "not_registered").length;
  const missingISRC = rows.filter((r) => !r.song.isrc).length;

  return (
    <AccessShell
      title="Publishing"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Staff", href: "/access/staff" },
        { label: "Publishing" },
      ]}
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Rights & Publishing</h2>
          <p className="text-[11px] text-white/30 mt-1">
            SoundExchange registration and rights metadata across all songs.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5">
          <div className="bg-black p-4">
            <p className="text-2xl font-black text-green-400">{registeredCnt}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Registered</p>
          </div>
          <div className="bg-black p-4">
            <p className="text-2xl font-black text-yellow-400/80">{pendingCnt}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Pending</p>
          </div>
          <div className="bg-black p-4">
            <p className={`text-2xl font-black ${notRegisteredCnt > 0 ? "text-red-400/70" : "text-white/30"}`}>
              {notRegisteredCnt}
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Not Registered</p>
          </div>
          <div className="bg-black p-4">
            <p className={`text-2xl font-black ${missingISRC > 0 ? "text-red-400/70" : "text-green-400"}`}>
              {missingISRC}
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Missing ISRC</p>
          </div>
        </div>

        {/* Full song table */}
        <div className="border border-white/5 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
              <span className="col-span-3">Title</span>
              <span className="col-span-2">Artist</span>
              <span className="col-span-2">ISRC</span>
              <span className="col-span-2">SoundExchange</span>
              <span className="col-span-1">PRO</span>
              <span className="col-span-1">Publisher</span>
              <span className="col-span-1" />
            </div>
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[11px] text-white/20">No songs in catalog.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {rows.map(({ song, sxStatus }) => (
                  <div
                    key={song.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                  >
                    <p className="col-span-3 text-[11px] text-white/60 truncate">{song.title}</p>
                    <p className="col-span-2 text-[10px] text-white/35 truncate">{song.artistName}</p>
                    <p className={`col-span-2 text-[9px] font-mono ${song.isrc ? "text-white/35" : "text-red-400/50"}`}>
                      {song.isrc ?? "—"}
                    </p>
                    <div className="col-span-2">
                      <span className={`text-[8px] tracking-[0.1em] uppercase border px-1 py-0.5 ${sxStatusColor(sxStatus)}`}>
                        {sxStatusLabel(sxStatus)}
                      </span>
                    </div>
                    <p className="col-span-1 text-[10px] text-white/35">{song.rightsMetadata?.pro ?? "—"}</p>
                    <p className="col-span-1 text-[10px] text-white/30 truncate">{song.rightsMetadata?.publisher ?? "—"}</p>
                    <div className="col-span-1 flex justify-end">
                      <Link
                        href={`/admin/songs/${song.slug}`}
                        className="text-[9px] uppercase text-white/20 hover:text-white transition-colors"
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
