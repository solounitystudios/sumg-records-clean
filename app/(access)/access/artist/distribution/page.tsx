"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

type DeliveryStatus = string | undefined;

function DeliveryBadge({ status }: { status: DeliveryStatus }) {
  const cls =
    status === "live"
      ? "border-green-800/40 text-green-400/60"
      : status === "delivered"
      ? "border-blue-800/40 text-blue-400/60"
      : status === "pending"
      ? "border-yellow-800/40 text-yellow-400/60"
      : status === "failed"
      ? "border-red-800/40 text-red-400/60"
      : "border-white/10 text-white/25";
  return (
    <span className={`text-[8px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${cls}`}>
      {status ?? "Unknown"}
    </span>
  );
}

export default function ArtistDistributionPage() {
  const user = useAccessUser();
  const { releases } = useCmsStore();

  const artistSlug = user.artistSlug ?? "";

  const myReleases = useMemo(
    () =>
      releases
        .filter((r) => r.artistSlug === artistSlug)
        .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
    [releases, artistSlug]
  );

  const liveCount = myReleases.filter((r) => r.distributionRecord?.deliveryStatus === "live").length;
  const deliveredCount = myReleases.filter((r) => r.distributionRecord?.deliveryStatus === "delivered").length;
  const pendingCount = myReleases.filter((r) => r.distributionRecord?.deliveryStatus === "pending").length;
  const withDistrib = myReleases.filter((r) => r.distributionRecord).length;

  return (
    <AccessShell
      title="Distribution"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist", href: "/access/artist" },
        { label: "Distribution" },
      ]}
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Distribution</h2>
          <p className="text-[11px] text-white/30 mt-1">
            Delivery and live status for your releases across DSPs.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-px bg-white/5">
          <div className="bg-black p-4">
            <p className="text-2xl font-black text-green-400">{liveCount}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Live</p>
          </div>
          <div className="bg-black p-4">
            <p className="text-2xl font-black text-blue-400/80">{deliveredCount}</p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Delivered</p>
          </div>
          <div className="bg-black p-4">
            <p className={`text-2xl font-black ${pendingCount > 0 ? "text-yellow-400/70" : "text-white/30"}`}>
              {pendingCount}
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">Pending</p>
          </div>
        </div>

        {/* Release list */}
        {myReleases.length === 0 ? (
          <div className="border border-white/5 py-16 text-center">
            <p className="text-[12px] text-white/20">No releases yet.</p>
          </div>
        ) : (
          <div className="border border-white/5 overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
                <span className="col-span-4">Release</span>
                <span className="col-span-2">Date</span>
                <span className="col-span-2">Distributor</span>
                <span className="col-span-1">UPC</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-1" />
              </div>
              {myReleases.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center divide-none"
                >
                  <div className="col-span-4 min-w-0">
                    <p className="text-[11px] text-white/65 truncate">{r.title}</p>
                    <p className="text-[9px] text-white/25 mt-0.5">{r.type}</p>
                  </div>
                  <p className="col-span-2 text-[10px] text-white/30 font-mono">
                    {r.releaseDate.slice(0, 10)}
                  </p>
                  <p className="col-span-2 text-[10px] text-white/35">
                    {r.distributionRecord?.distributor ?? "—"}
                  </p>
                  <p className="col-span-1 text-[9px] font-mono text-white/25 truncate">
                    {r.distributionRecord?.upc ?? "—"}
                  </p>
                  <div className="col-span-2">
                    <DeliveryBadge status={r.distributionRecord?.deliveryStatus} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Link
                      href={`/access/artist/releases/${r.slug}`}
                      className="text-[9px] tracking-[0.1em] uppercase text-white/20 hover:text-white transition-colors"
                    >
                      →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {withDistrib === 0 && myReleases.length > 0 && (
          <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 mb-1.5">No Distribution Records</p>
            <p className="text-[11px] text-white/35 leading-relaxed">
              Distribution records haven't been set up for your releases yet.
              Contact your label manager to add distribution information.
            </p>
          </div>
        )}
      </div>
    </AccessShell>
  );
}
