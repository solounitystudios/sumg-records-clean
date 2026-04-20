"use client";

/**
 * /admin/rights — Rights metadata management for songs and releases.
 *
 * Per-song view shows: PRO, IPI/CAE, publisher, songwriter credits,
 * composition status, registration status, and reference URLs (BMI/ASCAP).
 *
 * Per-release view shows: PRO, publisher, composition status, and notes.
 *
 * Data is entered manually or imported. BMI and ASCAP do not provide
 * real-time public APIs — reference URLs and registration status must be
 * confirmed and entered by the rights team.
 *
 * Status badges: draft | pending | registered | issue
 */

import { useState, useMemo } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useCmsStore } from "@/lib/cms/store";
import { RightsStatus } from "@/lib/types";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabType = "songs" | "releases";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rightsStatusColor(status?: RightsStatus | string): string {
  if (!status || status === "draft") return "border-white/10 text-white/30";
  if (status === "pending") return "border-yellow-800/40 text-yellow-400/60";
  if (status === "registered") return "border-green-800/40 text-green-400/60";
  if (status === "issue") return "border-red-800/40 text-red-400/60";
  return "border-white/10 text-white/30";
}

function rightsStatusLabel(status?: string): string {
  if (!status) return "No Data";
  if (status === "draft") return "Draft";
  if (status === "pending") return "Pending";
  if (status === "registered") return "Registered";
  if (status === "issue") return "Issue";
  return status;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RightsPage() {
  const { songs, releases } = useCmsStore();

  const [tab, setTab] = useState<TabType>("songs");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPRO, setFilterPRO] = useState<string>("all");

  // ── Stats (songs-only for the summary tiles) ──────────────────────────────
  const activeSongs = songs.filter((s) => s.status !== "archived");
  const registered = activeSongs.filter(
    (s) => s.rightsMetadata?.compositionStatus === "registered"
  ).length;
  const pending = activeSongs.filter(
    (s) => s.rightsMetadata?.compositionStatus === "pending"
  ).length;
  const withIssue = activeSongs.filter(
    (s) => s.rightsMetadata?.compositionStatus === "issue"
  ).length;
  const noData = activeSongs.filter(
    (s) => !s.rightsMetadata?.compositionStatus
  ).length;

  // ── Filtered songs ────────────────────────────────────────────────────────
  const filteredSongs = useMemo(() => {
    let rows = songs.filter((s) => s.status !== "archived");

    if (filterStatus !== "all") {
      rows = rows.filter((s) => {
        if (filterStatus === "no_data") return !s.rightsMetadata?.compositionStatus;
        return s.rightsMetadata?.compositionStatus === filterStatus;
      });
    }
    if (filterPRO !== "all") {
      rows = rows.filter((s) => s.rightsMetadata?.pro === filterPRO);
    }

    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [songs, filterStatus, filterPRO]);

  // ── Filtered releases ─────────────────────────────────────────────────────
  const filteredReleases = useMemo(() => {
    let rows = releases.filter((r) => r.status !== "archived");

    if (filterStatus !== "all") {
      rows = rows.filter((r) => {
        if (filterStatus === "no_data") return !r.rightsMetadata?.compositionStatus;
        return r.rightsMetadata?.compositionStatus === filterStatus;
      });
    }
    if (filterPRO !== "all") {
      rows = rows.filter(
        (r) =>
          r.rightsMetadata?.pro === filterPRO ||
          (r.providerConfig?.pro as string | undefined) === filterPRO
      );
    }

    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [releases, filterStatus, filterPRO]);

  return (
    <AdminShell title="Rights">
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
            <p className="text-2xl font-black text-green-400">{registered}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-green-400/60 mt-1">
              Registered
            </p>
          </div>
          <div className="border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-2xl font-black text-yellow-400">{pending}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-yellow-400/60 mt-1">
              Pending
            </p>
          </div>
          <div className="border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-2xl font-black text-red-400">{withIssue}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-red-400/60 mt-1">
              Issues
            </p>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-4">
            <p className="text-2xl font-black text-white/40">{noData}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mt-1">
              No Data
            </p>
          </div>
        </div>

        {/* ── Data origin notice ──────────────────────────────────────────── */}
        <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
            Data Origin
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed max-w-2xl">
            Rights metadata is entered manually or imported via CSV/JSON. BMI and ASCAP
            do not provide real-time public APIs — reference URLs and registration status
            must be confirmed and entered by your rights team. Use IPI/CAE numbers, PRO
            work IDs, and reference links as your source of truth.
          </p>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex gap-0 border-b border-white/5">
          {(["songs", "releases"] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-white/40 text-white/80"
                  : "border-transparent text-white/25 hover:text-white/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:border-white/30 focus:outline-none"
          >
            <option value="all" className="bg-neutral-900">All Statuses</option>
            <option value="registered" className="bg-neutral-900">Registered</option>
            <option value="pending" className="bg-neutral-900">Pending</option>
            <option value="issue" className="bg-neutral-900">Issue</option>
            <option value="draft" className="bg-neutral-900">Draft</option>
            <option value="no_data" className="bg-neutral-900">No Data</option>
          </select>

          <select
            value={filterPRO}
            onChange={(e) => setFilterPRO(e.target.value)}
            className="bg-transparent border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:border-white/30 focus:outline-none"
          >
            <option value="all" className="bg-neutral-900">All PROs</option>
            <option value="BMI" className="bg-neutral-900">BMI</option>
            <option value="ASCAP" className="bg-neutral-900">ASCAP</option>
            <option value="SESAC" className="bg-neutral-900">SESAC</option>
            <option value="PRS" className="bg-neutral-900">PRS</option>
            <option value="SOCAN" className="bg-neutral-900">SOCAN</option>
            <option value="Other" className="bg-neutral-900">Other</option>
          </select>
        </div>

        {/* ── Songs table ────────────────────────────────────────────────── */}
        {tab === "songs" && (
          <>
            {filteredSongs.length === 0 ? (
              <div className="border border-white/5 py-16 text-center">
                <p className="text-[13px] text-white/20">
                  No songs match the current filters.
                </p>
              </div>
            ) : (
              <div className="border border-white/5 overflow-x-auto">
                <div className="min-w-[900px] grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
                  <span className="col-span-3">Song</span>
                  <span className="col-span-2">Artist</span>
                  <span className="col-span-1">PRO</span>
                  <span className="col-span-2">Publisher</span>
                  <span className="col-span-1">IPI / CAE</span>
                  <span className="col-span-1">Comp.</span>
                  <span className="col-span-1">Reg.</span>
                  <span className="col-span-1" />
                </div>
                <div className="min-w-[900px] divide-y divide-white/[0.03]">
                  {filteredSongs.map((song) => {
                    const rm = song.rightsMetadata;
                    return (
                      <div
                        key={song.id}
                        className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-start"
                      >
                        {/* Song title + ISRC */}
                        <div className="col-span-3 min-w-0">
                          <p className="text-[11px] text-white/70 truncate">
                            {song.title}
                          </p>
                          {song.isrc ? (
                            <p className="text-[9px] font-mono text-white/25 mt-0.5">
                              {song.isrc}
                            </p>
                          ) : (
                            <p className="text-[9px] font-mono text-red-400/40 mt-0.5">
                              No ISRC
                            </p>
                          )}
                        </div>

                        {/* Artist */}
                        <p className="col-span-2 text-[11px] text-white/40 truncate">
                          {song.artistName}
                        </p>

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
                          className={`col-span-2 text-[10px] truncate ${
                            rm?.publisher ? "text-white/40" : "text-white/20"
                          }`}
                        >
                          {rm?.publisher ?? "—"}
                        </p>

                        {/* IPI / CAE */}
                        <p
                          className={`col-span-1 text-[10px] font-mono truncate ${
                            rm?.ipiCae ? "text-white/40" : "text-white/20"
                          }`}
                        >
                          {rm?.ipiCae ?? "—"}
                        </p>

                        {/* Composition status */}
                        <div className="col-span-1">
                          <span
                            className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${rightsStatusColor(rm?.compositionStatus)}`}
                          >
                            {rightsStatusLabel(rm?.compositionStatus)}
                          </span>
                        </div>

                        {/* Registration status */}
                        <div className="col-span-1">
                          <span
                            className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${rightsStatusColor(rm?.registrationStatus)}`}
                          >
                            {rightsStatusLabel(rm?.registrationStatus)}
                          </span>
                        </div>

                        {/* Action links */}
                        <div className="col-span-1 flex items-center justify-end gap-2">
                          {rm?.bmiWorkUrl && (
                            <a
                              href={rm.bmiWorkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] tracking-[0.1em] uppercase text-white/20 hover:text-white transition-colors"
                            >
                              BMI↗
                            </a>
                          )}
                          {rm?.ascapWorkUrl && (
                            <a
                              href={rm.ascapWorkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] tracking-[0.1em] uppercase text-white/20 hover:text-white transition-colors"
                            >
                              ASCAP↗
                            </a>
                          )}
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
          </>
        )}

        {/* ── Releases table ─────────────────────────────────────────────── */}
        {tab === "releases" && (
          <>
            {filteredReleases.length === 0 ? (
              <div className="border border-white/5 py-16 text-center">
                <p className="text-[13px] text-white/20">
                  No releases match the current filters.
                </p>
              </div>
            ) : (
              <div className="border border-white/5 overflow-x-auto">
                <div className="min-w-[800px] grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
                  <span className="col-span-3">Release</span>
                  <span className="col-span-2">Artist</span>
                  <span className="col-span-1">Type</span>
                  <span className="col-span-1">PRO</span>
                  <span className="col-span-2">Publisher</span>
                  <span className="col-span-1">Comp.</span>
                  <span className="col-span-1">Notes</span>
                  <span className="col-span-1" />
                </div>
                <div className="min-w-[800px] divide-y divide-white/[0.03]">
                  {filteredReleases.map((release) => {
                    const rm = release.rightsMetadata;
                    const pro =
                      rm?.pro ??
                      (release.providerConfig?.pro as string | undefined);
                    const publisher =
                      rm?.publisher ??
                      release.providerConfig?.publishingAdmin;
                    return (
                      <div
                        key={release.id}
                        className="min-w-[800px] grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                      >
                        <div className="col-span-3 min-w-0">
                          <p className="text-[11px] text-white/70 truncate">
                            {release.title}
                          </p>
                        </div>
                        <p className="col-span-2 text-[11px] text-white/40 truncate">
                          {release.artistName}
                        </p>
                        <p className="col-span-1 text-[10px] font-mono text-white/30">
                          {release.type}
                        </p>
                        <p
                          className={`col-span-1 text-[10px] font-mono ${
                            pro ? "text-white/50" : "text-white/20"
                          }`}
                        >
                          {pro ?? "—"}
                        </p>
                        <p
                          className={`col-span-2 text-[10px] truncate ${
                            publisher ? "text-white/40" : "text-white/20"
                          }`}
                        >
                          {publisher ?? "—"}
                        </p>
                        <div className="col-span-1">
                          <span
                            className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${rightsStatusColor(rm?.compositionStatus)}`}
                          >
                            {rightsStatusLabel(rm?.compositionStatus)}
                          </span>
                        </div>
                        <p className="col-span-1 text-[10px] text-white/20 truncate">
                          {rm?.rightsNotes ?? "—"}
                        </p>
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
          </>
        )}
      </div>
    </AdminShell>
  );
}
