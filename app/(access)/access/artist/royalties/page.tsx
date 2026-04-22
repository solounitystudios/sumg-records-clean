"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

/**
 * /access/artist/royalties — Royalty registration tracker for the current artist.
 *
 * Shows per-song SoundExchange / PRO registration status pulled from the
 * existing providerConfig / rightsMetadata data in the CMS store.
 * Revenue statement import (CSV) is a Phase 2 feature on the staff side.
 */
export default function ArtistRoyaltiesPage() {
  const user = useAccessUser();
  const { songs, artists } = useCmsStore();

  const artistSlug = user.artistSlug ?? "";

  const artist = useMemo(() => artists.find((a) => a.slug === artistSlug), [artists, artistSlug]);

  const mySongs = useMemo(
    () => songs.filter((s) => s.artistSlug === artistSlug && s.status !== "archived"),
    [songs, artistSlug]
  );

  const registered = mySongs.filter((s) => artist?.providerConfig?.soundExchangeStatus === "registered").length;
  const pending = mySongs.filter((s) => artist?.providerConfig?.soundExchangeStatus === "pending").length;
  const notRegistered = mySongs.length - registered - pending;

  const proRegistered = mySongs.filter((s) => s.rightsMetadata?.pro).length;
  const publisherSet = mySongs.filter((s) => s.rightsMetadata?.publisher).length;

  return (
    <AccessShell
      title="Royalties"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist", href: "/access/artist" },
        { label: "Royalties" },
      ]}
    >
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Royalties</h2>
          <p className="text-[11px] text-white/30 mt-1">
            Registration status and rights data for your songs.
          </p>
        </div>

        {/* SoundExchange summary */}
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">
            SoundExchange Registration
          </p>
          <div className="grid grid-cols-3 gap-px bg-white/5">
            <div className="bg-black p-4">
              <p className="text-2xl font-black text-green-400">{registered}</p>
              <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Registered</p>
            </div>
            <div className="bg-black p-4">
              <p className="text-2xl font-black text-yellow-400/80">{pending}</p>
              <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Pending</p>
            </div>
            <div className="bg-black p-4">
              <p className={`text-2xl font-black ${notRegistered > 0 ? "text-red-400/70" : "text-white/30"}`}>
                {notRegistered}
              </p>
              <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Not Registered</p>
            </div>
          </div>
        </div>

        {/* PRO / Publishing summary */}
        <div className="grid grid-cols-2 gap-px bg-white/5">
          <div className="bg-black px-4 py-4">
            <p className="text-xl font-black text-white/60">{proRegistered}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Songs with PRO</p>
          </div>
          <div className="bg-black px-4 py-4">
            <p className="text-xl font-black text-white/60">{publisherSet}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Publisher Set</p>
          </div>
        </div>

        {/* Provider info */}
        {artist?.providerConfig && (
          <div>
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">Provider Config</p>
            <div className="border border-white/5 divide-y divide-white/[0.04]">
              {[
                { label: "Distributor", value: artist.providerConfig.distributor },
                { label: "PRO", value: artist.providerConfig.pro },
                { label: "Publishing Admin", value: artist.providerConfig.publishingAdmin },
                { label: "ISRC Prefix", value: artist.providerConfig.isrc },
                { label: "SoundExchange", value: artist.providerConfig.soundExchangeStatus },
              ]
                .filter((row) => row.value)
                .map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/30">{row.label}</p>
                    <p className="text-[11px] text-white/50 capitalize">{row.value}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Per-song table */}
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">
            {mySongs.length} Song{mySongs.length !== 1 ? "s" : ""}
          </p>
          {mySongs.length === 0 ? (
            <div className="border border-white/5 py-10 text-center">
              <p className="text-[11px] text-white/20">No songs yet.</p>
            </div>
          ) : (
            <div className="border border-white/5 overflow-x-auto">
              <div className="min-w-[600px] divide-y divide-white/[0.03]">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 bg-white/[0.01]">
                  <span className="col-span-4">Title</span>
                  <span className="col-span-2">ISRC</span>
                  <span className="col-span-2">PRO</span>
                  <span className="col-span-2">Publisher</span>
                  <span className="col-span-2">Last Verified</span>
                </div>
                {mySongs.map((s) => (
                  <Link
                    key={s.id}
                    href={`/access/artist/songs/${s.slug}`}
                    className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                  >
                    <p className="col-span-4 text-[11px] text-white/60 truncate">{s.title}</p>
                    <p className={`col-span-2 text-[9px] font-mono ${s.isrc ? "text-white/35" : "text-red-400/40"}`}>
                      {s.isrc ?? "—"}
                    </p>
                    <p className="col-span-2 text-[10px] text-white/35">{s.rightsMetadata?.pro ?? "—"}</p>
                    <p className="col-span-2 text-[10px] text-white/35 truncate">{s.rightsMetadata?.publisher ?? "—"}</p>
                    <p className="col-span-2 text-[9px] font-mono text-white/20">
                      {s.rightsMetadata?.lastVerified?.slice(0, 10) ?? "—"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Phase 2 notice */}
        <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 mb-1.5">Statement Import</p>
          <p className="text-[11px] text-white/35 leading-relaxed">
            Revenue statement import (DistroKid, BMI, Apple, SoundExchange) is available in
            the staff portal. Your statements will appear here once your label manager imports them.
          </p>
        </div>
      </div>
    </AccessShell>
  );
}
