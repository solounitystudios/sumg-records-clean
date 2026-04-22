"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useCmsStore } from "@/lib/cms/store";

/**
 * /access/staff/royalties — Cross-artist royalty registration and rights overview.
 * CSV import lives at /admin/import; this view summarises the catalog health.
 */
export default function StaffRoyaltiesPage() {
  const { artists, songs } = useCmsStore();

  const artistMap = useMemo(
    () => new Map(artists.map((a) => [a.slug, a])),
    [artists]
  );

  const rows = useMemo(
    () =>
      artists.map((a) => {
        const mySongs = songs.filter(
          (s) => s.artistSlug === a.slug && s.status !== "archived"
        );
        const withISRC = mySongs.filter((s) => s.isrc).length;
        const withPRO = mySongs.filter((s) => s.rightsMetadata?.pro).length;
        const sxStatus = a.providerConfig?.soundExchangeStatus;
        return { artist: a, total: mySongs.length, withISRC, withPRO, sxStatus };
      }),
    [artists, songs]
  );

  const totalSongs = songs.filter((s) => s.status !== "archived").length;
  const totalISRC = songs.filter((s) => s.status !== "archived" && s.isrc).length;
  const totalPRO = songs.filter((s) => s.rightsMetadata?.pro).length;

  return (
    <AccessShell
      title="Royalties"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Staff", href: "/access/staff" },
        { label: "Royalties" },
      ]}
    >
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Royalties</h2>
            <p className="text-[11px] text-white/30 mt-1">
              Rights registration status across all artists.
            </p>
          </div>
          <Link
            href="/admin/import"
            className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/25 hover:text-white/70 transition-all flex-shrink-0"
          >
            Import CSV →
          </Link>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-px bg-white/5">
          <div className="bg-black p-4">
            <p className="text-2xl font-black text-white/70">{totalSongs}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Total Songs</p>
          </div>
          <div className="bg-black p-4">
            <p className={`text-2xl font-black ${totalISRC < totalSongs ? "text-yellow-400/70" : "text-green-400"}`}>
              {totalISRC}
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">With ISRC</p>
          </div>
          <div className="bg-black p-4">
            <p className="text-2xl font-black text-white/50">{totalPRO}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">PRO Registered</p>
          </div>
        </div>

        {/* Per-artist breakdown */}
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">By Artist</p>
          <div className="border border-white/5 overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
                <span className="col-span-3">Artist</span>
                <span className="col-span-1">Songs</span>
                <span className="col-span-2">ISRC</span>
                <span className="col-span-2">PRO</span>
                <span className="col-span-2">SoundExchange</span>
                <span className="col-span-2" />
              </div>
              <div className="divide-y divide-white/[0.03]">
                {rows.map(({ artist, total, withISRC, withPRO, sxStatus }) => (
                  <div
                    key={artist.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                  >
                    <p className="col-span-3 text-[11px] text-white/60 truncate">{artist.name}</p>
                    <p className="col-span-1 text-[10px] font-mono text-white/35">{total}</p>
                    <p className={`col-span-2 text-[10px] font-mono ${withISRC < total ? "text-yellow-400/60" : "text-green-400/70"}`}>
                      {withISRC}/{total}
                    </p>
                    <p className="col-span-2 text-[10px] font-mono text-white/35">{withPRO}/{total}</p>
                    <div className="col-span-2">
                      {sxStatus ? (
                        <span className={`text-[8px] tracking-[0.1em] uppercase border px-1 py-0.5 ${
                          sxStatus === "registered" ? "border-green-800/40 text-green-400/60"
                          : sxStatus === "pending" ? "border-yellow-800/40 text-yellow-400/60"
                          : "border-red-800/40 text-red-400/50"
                        }`}>
                          {sxStatus.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-[8px] text-white/20">—</span>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-3">
                      <Link
                        href={`/admin/artists/${artist.slug}`}
                        className="text-[9px] uppercase text-white/20 hover:text-white transition-colors"
                      >
                        Edit →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Import notice */}
        <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 mb-1.5">Revenue Import</p>
          <p className="text-[11px] text-white/35 leading-relaxed">
            Import DistroKid, BMI, Apple Music, or SoundExchange CSV statements at{" "}
            <Link href="/admin/import" className="text-white/50 hover:text-white transition-colors">
              /admin/import
            </Link>
            . Statements are auto-detected and artist-assigned on import.
          </p>
        </div>
      </div>
    </AccessShell>
  );
}
