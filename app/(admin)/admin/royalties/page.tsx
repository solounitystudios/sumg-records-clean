"use client";

/**
 * /admin/royalties — SoundExchange & neighboring rights royalty registration tracker.
 *
 * Displays per-song registration status sourced from the linked artist's
 * providerConfig.soundExchangeStatus or the song's own rightsMetadata.
 *
 * Ingestion strategy:
 *   SoundExchange does not provide a real-time API for third-party integrations.
 *   Registration status is entered manually and stored as reference data.
 */

import { useMemo } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useCmsStore } from "@/lib/cms/store";
import Link from "next/link";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoyaltiesPage() {
  const { songs, artists } = useCmsStore();

  // Build artist slug → providerConfig map for fast lookup
  const artistMap = useMemo(
    () => new Map(artists.map((a) => [a.slug, a])),
    [artists]
  );

  const activeSongs = useMemo(
    () => songs.filter((s) => s.status !== "archived"),
    [songs]
  );

  // Resolve SoundExchange status: prefer artist providerConfig, fall back to song rightsMetadata source
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

  // ── Summary counts ────────────────────────────────────────────────────────
  const registeredCnt = rows.filter((r) => r.sxStatus === "registered").length;
  const pendingCnt = rows.filter((r) => r.sxStatus === "pending").length;
  const notRegisteredCnt = rows.filter(
    (r) => r.sxStatus === "not_registered" || r.sxStatus === undefined
  ).length;

  return (
    <AdminShell title="Royalties">
      <div className="space-y-8">
        {/* ── Back ───────────────────────────────────────────────────────── */}
        <Link
          href="/admin"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
        >
          ← Dashboard
        </Link>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-white/70">
            Royalties
          </h2>
          <p className="text-[11px] text-white/35 mt-1 leading-relaxed">
            SoundExchange &amp; neighboring rights registration tracker. Monitor
            digital performance royalty registration status across the catalog.
          </p>
        </div>

        {/* ── Summary tiles ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-2xl font-black text-green-400">{registeredCnt}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-green-400/60 mt-1">
              Registered
            </p>
          </div>
          <div className="border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-2xl font-black text-yellow-400">{pendingCnt}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-yellow-400/60 mt-1">
              Pending
            </p>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-4">
            <p className="text-2xl font-black text-white/40">{notRegisteredCnt}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mt-1">
              Not Registered
            </p>
          </div>
        </div>

        {/* ── Ingestion strategy notice ───────────────────────────────────── */}
        <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
            Ingestion Strategy
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed max-w-2xl">
            SoundExchange does not provide a real-time API for third-party integrations.
            Registration status is entered manually and reference IDs are stored here
            as a tracking layer. Update artist providerConfig with the SoundExchange
            registration status after confirming with the rights team.
          </p>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/20">
          {rows.length} songs
        </p>

        {rows.length === 0 ? (
          <div className="border border-white/5 py-16 text-center">
            <p className="text-[13px] text-white/20">No songs in catalog.</p>
          </div>
        ) : (
          <div className="border border-white/5 overflow-x-auto">
            {/* Column headers */}
            <div className="min-w-[800px] grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
              <span className="col-span-3">Title</span>
              <span className="col-span-2">Artist</span>
              <span className="col-span-1">ISRC</span>
              <span className="col-span-2">SoundExchange</span>
              <span className="col-span-1">PRO</span>
              <span className="col-span-1">Publisher</span>
              <span className="col-span-1">Last Verified</span>
              <span className="col-span-1" />
            </div>

            {/* Rows */}
            <div className="min-w-[800px] divide-y divide-white/[0.03]">
              {rows.map(({ song, sxStatus }) => {
                const rm = song.rightsMetadata;
                return (
                  <div
                    key={song.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                  >
                    {/* Title */}
                    <div className="col-span-3 min-w-0">
                      <p className="text-[11px] text-white/70 truncate">
                        {song.title}
                      </p>
                    </div>

                    {/* Artist */}
                    <p className="col-span-2 text-[10px] text-white/40 truncate">
                      {song.artistName}
                    </p>

                    {/* ISRC */}
                    <p
                      className={`col-span-1 text-[10px] font-mono truncate ${
                        song.isrc ? "text-white/35" : "text-red-400/40"
                      }`}
                    >
                      {song.isrc ?? "—"}
                    </p>

                    {/* SoundExchange status */}
                    <div className="col-span-2">
                      <span
                        className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${sxStatusColor(sxStatus)}`}
                      >
                        {sxStatusLabel(sxStatus)}
                      </span>
                    </div>

                    {/* PRO */}
                    <p
                      className={`col-span-1 text-[10px] font-mono ${
                        rm?.pro ? "text-white/50" : "text-white/20"
                      }`}
                    >
                      {rm?.pro ?? "—"}
                    </p>

                    {/* Publisher */}
                    <p
                      className={`col-span-1 text-[10px] truncate ${
                        rm?.publisher ? "text-white/40" : "text-white/20"
                      }`}
                    >
                      {rm?.publisher ?? "—"}
                    </p>

                    {/* Last verified */}
                    <p className="col-span-1 text-[10px] font-mono text-white/20">
                      {rm?.lastVerified ? rm.lastVerified.slice(0, 10) : "—"}
                    </p>

                    {/* Edit */}
                    <div className="col-span-1 flex justify-end">
                      <Link
                        href={`/admin/songs/${song.slug}`}
                        className="text-[10px] tracking-[0.15em] uppercase text-white/20 hover:text-white transition-colors"
                      >
                        Edit →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
