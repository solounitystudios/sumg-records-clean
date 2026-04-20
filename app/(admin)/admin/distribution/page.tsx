"use client";

/**
 * /admin/distribution — Distribution tracking for all releases.
 *
 * Shows: distributor, submission/delivery/live status, UPC, DSP link count,
 * distributor reference ID, and release date.
 *
 * Statuses: draft | queued | submitted | delivered | live | issue
 *
 * Ingestion strategy:
 *   Distribution data is entered manually or imported via CSV/JSON.
 *   DistroKid and similar services do not provide a real-time public API
 *   for third-party integrations. Store reference IDs and confirmed status
 *   here as a reference layer. Use the Ref ID field to link back to your
 *   distributor dashboard.
 */

import { useState, useMemo } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useCmsStore } from "@/lib/cms/store";
import { CMSRelease } from "@/lib/types";
import Link from "next/link";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function distroStatusColor(status?: string): string {
  if (!status || status === "draft") return "border-white/10 text-white/30";
  if (status === "queued") return "border-blue-800/40 text-blue-400/60";
  if (status === "submitted") return "border-yellow-800/40 text-yellow-400/60";
  if (status === "delivered") return "border-purple-800/40 text-purple-400/60";
  if (status === "live") return "border-green-800/40 text-green-400/60";
  if (status === "issue") return "border-red-800/40 text-red-400/60";
  return "border-white/10 text-white/30";
}

/** Derives the best available distribution live-status string for a release. */
function getEffectiveLiveStatus(release: CMSRelease): string {
  if (release.distributionRecord?.liveStatus) return release.distributionRecord.liveStatus;
  const sub = release.providerConfig?.submissionStatus;
  if (sub === "distributed") return "live";
  if (sub === "submitted") return "submitted";
  if (sub === "pending") return "queued";
  return "draft";
}

function getEffectiveDistributor(release: CMSRelease): string | undefined {
  return release.distributionRecord?.distributor ?? release.providerConfig?.distributor;
}

function getEffectiveUPC(release: CMSRelease): string | undefined {
  return release.distributionRecord?.upc ?? release.providerConfig?.upc;
}

function countDSPLinks(release: CMSRelease): number {
  const dsp = release.dspLinks;
  if (!dsp) return 0;
  return Object.values(dsp).filter(Boolean).length;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DistributionPage() {
  const { releases } = useCmsStore();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDistributor, setFilterDistributor] = useState<string>("all");
  const [filterMissing, setFilterMissing] = useState<string>("none");

  // ── Unique distributors ───────────────────────────────────────────────────
  const distributors = useMemo(() => {
    const names = new Set(
      releases
        .map((r) => getEffectiveDistributor(r))
        .filter((d): d is string => Boolean(d))
    );
    return Array.from(names).sort();
  }, [releases]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const activeReleases = releases.filter((r) => r.status !== "archived");
  const liveCnt = activeReleases.filter(
    (r) => getEffectiveLiveStatus(r) === "live"
  ).length;
  const submittedCnt = activeReleases.filter((r) =>
    ["submitted", "delivered"].includes(getEffectiveLiveStatus(r))
  ).length;
  const issueCnt = activeReleases.filter(
    (r) => getEffectiveLiveStatus(r) === "issue"
  ).length;
  const noDistributorCnt = activeReleases.filter(
    (r) => !getEffectiveDistributor(r)
  ).length;

  // ── Filtered releases ─────────────────────────────────────────────────────
  const filteredReleases = useMemo(() => {
    let rows = releases.filter((r) => r.status !== "archived");

    if (filterStatus !== "all") {
      rows = rows.filter((r) => getEffectiveLiveStatus(r) === filterStatus);
    }
    if (filterDistributor !== "all") {
      rows = rows.filter(
        (r) => getEffectiveDistributor(r) === filterDistributor
      );
    }
    if (filterMissing === "no_distributor") {
      rows = rows.filter((r) => !getEffectiveDistributor(r));
    } else if (filterMissing === "no_upc") {
      rows = rows.filter((r) => !getEffectiveUPC(r));
    } else if (filterMissing === "no_dsp") {
      rows = rows.filter((r) => countDSPLinks(r) === 0);
    }

    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [releases, filterStatus, filterDistributor, filterMissing]);

  return (
    <AdminShell title="Distribution">
      <div className="space-y-8">
        {/* ── Back ───────────────────────────────────────────────────────── */}
        <Link
          href="/admin"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
        >
          ← Dashboard
        </Link>

        {/* ── Summary tiles ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-2xl font-black text-green-400">{liveCnt}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-green-400/60 mt-1">
              Live
            </p>
          </div>
          <div className="border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-2xl font-black text-yellow-400">{submittedCnt}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-yellow-400/60 mt-1">
              Submitted / Delivered
            </p>
          </div>
          <div className="border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-2xl font-black text-red-400">{issueCnt}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-red-400/60 mt-1">
              Issues
            </p>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-4">
            <p className="text-2xl font-black text-white/40">{noDistributorCnt}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mt-1">
              No Distributor
            </p>
          </div>
        </div>

        {/* ── Ingestion strategy notice ───────────────────────────────────── */}
        <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
            Ingestion Strategy
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed max-w-2xl">
            Distribution data is entered manually or imported via CSV/JSON. DistroKid
            and similar services do not provide a real-time public API for third-party
            integrations. Store your distributor release IDs, UPCs, and submission dates
            here as a reference layer. Use the Ref ID field to link back to your
            distributor dashboard. DSP links are set separately in the release editor.
          </p>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:border-white/30 focus:outline-none"
          >
            <option value="all" className="bg-neutral-900">All Statuses</option>
            <option value="draft" className="bg-neutral-900">Draft</option>
            <option value="queued" className="bg-neutral-900">Queued</option>
            <option value="submitted" className="bg-neutral-900">Submitted</option>
            <option value="delivered" className="bg-neutral-900">Delivered</option>
            <option value="live" className="bg-neutral-900">Live</option>
            <option value="issue" className="bg-neutral-900">Issue</option>
          </select>

          <select
            value={filterDistributor}
            onChange={(e) => setFilterDistributor(e.target.value)}
            className="bg-transparent border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:border-white/30 focus:outline-none"
          >
            <option value="all" className="bg-neutral-900">All Distributors</option>
            {distributors.map((d) => (
              <option key={d} value={d} className="bg-neutral-900">
                {d}
              </option>
            ))}
          </select>

          <select
            value={filterMissing}
            onChange={(e) => setFilterMissing(e.target.value)}
            className="bg-transparent border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:border-white/30 focus:outline-none"
          >
            <option value="none" className="bg-neutral-900">All Records</option>
            <option value="no_distributor" className="bg-neutral-900">
              Missing Distributor
            </option>
            <option value="no_upc" className="bg-neutral-900">Missing UPC</option>
            <option value="no_dsp" className="bg-neutral-900">Missing DSP Links</option>
          </select>

          {filterMissing !== "none" && (
            <button
              onClick={() => setFilterMissing("none")}
              className="px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/30 hover:text-white/60 transition-colors"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* ── Result count ───────────────────────────────────────────────── */}
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/20">
          {filteredReleases.length} of {activeReleases.length} releases
        </p>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        {filteredReleases.length === 0 ? (
          <div className="border border-white/5 py-16 text-center">
            <p className="text-[13px] text-white/20">
              No releases match the current filters.
            </p>
          </div>
        ) : (
          <div className="border border-white/5 overflow-x-auto">
            {/* Column headers */}
            <div className="min-w-[1000px] grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
              <span className="col-span-2">Release</span>
              <span className="col-span-1">Artist</span>
              <span className="col-span-1">Type</span>
              <span className="col-span-1">Release Status</span>
              <span className="col-span-1">Distro Status</span>
              <span className="col-span-1">Distributor</span>
              <span className="col-span-1">UPC</span>
              <span className="col-span-1">DSP Links</span>
              <span className="col-span-1">Ref ID</span>
              <span className="col-span-1">Date</span>
              <span className="col-span-1" />
            </div>

            {/* Rows */}
            <div className="min-w-[1000px] divide-y divide-white/[0.03]">
              {filteredReleases.map((release) => {
                const dr = release.distributionRecord;
                const distributor = getEffectiveDistributor(release);
                const upc = getEffectiveUPC(release);
                const dspCount = countDSPLinks(release);
                const liveStatus = getEffectiveLiveStatus(release);

                return (
                  <div
                    key={release.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                  >
                    {/* Title */}
                    <div className="col-span-2 min-w-0">
                      <p className="text-[11px] text-white/70 truncate">
                        {release.title}
                      </p>
                    </div>

                    {/* Artist */}
                    <p className="col-span-1 text-[10px] text-white/40 truncate">
                      {release.artistName}
                    </p>

                    {/* Type */}
                    <p className="col-span-1 text-[10px] font-mono text-white/30">
                      {release.type}
                    </p>

                    {/* Release status */}
                    <div className="col-span-1">
                      <span
                        className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${
                          release.status === "published"
                            ? "border-green-800/40 text-green-400/60"
                            : release.status === "scheduled"
                            ? "border-yellow-800/40 text-yellow-400/60"
                            : "border-white/10 text-white/30"
                        }`}
                      >
                        {release.status}
                      </span>
                    </div>

                    {/* Distribution status */}
                    <div className="col-span-1">
                      <span
                        className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${distroStatusColor(liveStatus)}`}
                      >
                        {liveStatus}
                      </span>
                    </div>

                    {/* Distributor */}
                    <p
                      className={`col-span-1 text-[10px] truncate ${
                        distributor ? "text-white/40" : "text-red-400/40"
                      }`}
                    >
                      {distributor ?? "Not set"}
                    </p>

                    {/* UPC */}
                    <p
                      className={`col-span-1 text-[10px] font-mono truncate ${
                        upc ? "text-white/40" : "text-white/20"
                      }`}
                    >
                      {upc ?? "—"}
                    </p>

                    {/* DSP link count */}
                    <p
                      className={`col-span-1 text-[10px] font-mono ${
                        dspCount > 0 ? "text-green-400/50" : "text-white/20"
                      }`}
                    >
                      {dspCount > 0
                        ? `${dspCount} link${dspCount !== 1 ? "s" : ""}`
                        : "None"}
                    </p>

                    {/* Distro reference ID */}
                    <p className="col-span-1 text-[10px] font-mono text-white/20 truncate">
                      {dr?.distroReferenceId ?? "—"}
                    </p>

                    {/* Release date */}
                    <p className="col-span-1 text-[10px] font-mono text-white/25">
                      {release.releaseDate
                        ? release.releaseDate.slice(0, 10)
                        : "—"}
                    </p>

                    {/* Edit */}
                    <div className="col-span-1 flex justify-end">
                      <Link
                        href={`/admin/releases/${release.slug}`}
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
