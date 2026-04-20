"use client";

/**
 * /admin/catalog — Unified catalog view for all songs and releases.
 *
 * Shows title, artist, release, type, status, release date, ISRC, UPC,
 * distributor, PRO, source, and last-updated for every catalog item.
 *
 * Supports filtering by:
 *   • Artist
 *   • Type (Song / Single / EP / Album / Mixtape)
 *   • Status (draft / published / scheduled / archived)
 *   • Missing metadata (ISRC / UPC / cover art / distributor / audio)
 *
 * Quick "Edit →" links open the relevant song or release editor.
 */

import { useState, useMemo } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useCmsStore } from "@/lib/cms/store";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabType = "all" | "songs" | "releases";
type MissingFilter = "none" | "isrc" | "upc" | "cover" | "distributor" | "audio";

interface CatalogRow {
  id: string;
  kind: "song" | "release";
  title: string;
  artistName: string;
  releaseName?: string;
  type: string;
  status: string;
  releaseDate?: string;
  isrc?: string;
  upc?: string;
  distributor?: string;
  pro?: string;
  source?: string;
  updatedAt: string;
  editHref: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  if (status === "published") return "border-green-800/50 text-green-400/70";
  if (status === "scheduled") return "border-yellow-800/50 text-yellow-400/70";
  if (status === "archived") return "border-white/[0.04] text-white/20";
  return "border-white/10 text-white/35";
}

function kindColor(kind: "song" | "release"): string {
  return kind === "song"
    ? "border-blue-800/40 text-blue-400/60"
    : "border-purple-800/40 text-purple-400/60";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const { songs, releases } = useCmsStore();

  const [tab, setTab] = useState<TabType>("all");
  const [filterArtist, setFilterArtist] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMissing, setFilterMissing] = useState<MissingFilter>("none");

  // ── Build catalog rows ────────────────────────────────────────────────────

  const allRows: CatalogRow[] = useMemo(() => {
    const songRows: CatalogRow[] = songs.map((s) => ({
      id: s.id,
      kind: "song",
      title: s.title,
      artistName: s.artistName,
      releaseName: s.releaseName,
      type: "Song",
      status: s.status,
      releaseDate: s.publishAt,
      isrc: s.isrc,
      upc: undefined,
      distributor: undefined,
      pro: s.rightsMetadata?.pro,
      source: s.dataSource,
      updatedAt: s.updatedAt,
      editHref: `/admin/songs/${s.slug}`,
    }));

    const releaseRows: CatalogRow[] = releases.map((r) => ({
      id: r.id,
      kind: "release",
      title: r.title,
      artistName: r.artistName,
      releaseName: undefined,
      type: r.type,
      status: r.status,
      releaseDate: r.releaseDate,
      isrc: undefined,
      upc: r.distributionRecord?.upc ?? r.providerConfig?.upc,
      distributor:
        r.distributionRecord?.distributor ?? r.providerConfig?.distributor,
      pro:
        r.rightsMetadata?.pro ??
        (r.providerConfig?.pro as string | undefined),
      source: r.dataSource,
      updatedAt: r.updatedAt,
      editHref: `/admin/releases/${r.slug}`,
    }));

    return [...songRows, ...releaseRows].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [songs, releases]);

  // ── Build song/release lookup maps for missing-metadata filters ───────────

  const songMap = useMemo(
    () => new Map(songs.map((s) => [s.id, s])),
    [songs]
  );
  const releaseMap = useMemo(
    () => new Map(releases.map((r) => [r.id, r])),
    [releases]
  );

  // ── Artist options ────────────────────────────────────────────────────────

  const artistOptions = useMemo(() => {
    const names = new Set(allRows.map((r) => r.artistName));
    return Array.from(names).sort();
  }, [allRows]);

  // ── Filtered rows ─────────────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (tab === "songs") rows = rows.filter((r) => r.kind === "song");
    if (tab === "releases") rows = rows.filter((r) => r.kind === "release");
    if (filterArtist !== "all") rows = rows.filter((r) => r.artistName === filterArtist);
    if (filterType !== "all") rows = rows.filter((r) => r.type === filterType);
    if (filterStatus !== "all") rows = rows.filter((r) => r.status === filterStatus);

    if (filterMissing === "isrc") {
      rows = rows.filter((r) => r.kind === "song" && !r.isrc);
    } else if (filterMissing === "upc") {
      rows = rows.filter((r) => r.kind === "release" && !r.upc);
    } else if (filterMissing === "cover") {
      rows = rows.filter((r) => {
        if (r.kind !== "release") return false;
        const rel = releaseMap.get(r.id);
        return !rel?.coverArtUrl;
      });
    } else if (filterMissing === "distributor") {
      rows = rows.filter((r) => !r.distributor);
    } else if (filterMissing === "audio") {
      rows = rows.filter((r) => {
        if (r.kind !== "song") return false;
        const s = songMap.get(r.id);
        return !s?.audioUrl && !s?.mediaAssetId;
      });
    }

    return rows;
  }, [allRows, tab, filterArtist, filterType, filterStatus, filterMissing, songMap, releaseMap]);

  // ── Summary counts ────────────────────────────────────────────────────────

  const totalSongs = allRows.filter((r) => r.kind === "song").length;
  const totalReleases = allRows.filter((r) => r.kind === "release").length;
  const missingISRC = allRows.filter((r) => r.kind === "song" && !r.isrc).length;
  const missingUPC = allRows.filter((r) => r.kind === "release" && !r.upc).length;

  return (
    <AdminShell title="Catalog">
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-6 text-[10px] tracking-[0.2em] uppercase">
              <span className="text-white/30">{totalSongs} songs</span>
              <span className="text-white/30">{totalReleases} releases</span>
              {missingISRC > 0 && (
                <span className="text-yellow-400/60">{missingISRC} missing ISRC</span>
              )}
              {missingUPC > 0 && (
                <span className="text-yellow-400/60">{missingUPC} missing UPC</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex gap-0 border-b border-white/5">
          {(["all", "songs", "releases"] as TabType[]).map((t) => (
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
            value={filterArtist}
            onChange={(e) => setFilterArtist(e.target.value)}
            className="bg-transparent border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:border-white/30 focus:outline-none"
          >
            <option value="all" className="bg-neutral-900">All Artists</option>
            {artistOptions.map((name) => (
              <option key={name} value={name} className="bg-neutral-900">{name}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:border-white/30 focus:outline-none"
          >
            <option value="all" className="bg-neutral-900">All Types</option>
            <option value="Song" className="bg-neutral-900">Song</option>
            <option value="Single" className="bg-neutral-900">Single</option>
            <option value="EP" className="bg-neutral-900">EP</option>
            <option value="Album" className="bg-neutral-900">Album</option>
            <option value="Mixtape" className="bg-neutral-900">Mixtape</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:border-white/30 focus:outline-none"
          >
            <option value="all" className="bg-neutral-900">All Statuses</option>
            <option value="published" className="bg-neutral-900">Published</option>
            <option value="draft" className="bg-neutral-900">Draft</option>
            <option value="scheduled" className="bg-neutral-900">Scheduled</option>
            <option value="archived" className="bg-neutral-900">Archived</option>
          </select>

          <select
            value={filterMissing}
            onChange={(e) => setFilterMissing(e.target.value as MissingFilter)}
            className="bg-transparent border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:border-white/30 focus:outline-none"
          >
            <option value="none" className="bg-neutral-900">All Records</option>
            <option value="isrc" className="bg-neutral-900">Missing ISRC</option>
            <option value="upc" className="bg-neutral-900">Missing UPC</option>
            <option value="cover" className="bg-neutral-900">Missing Cover Art</option>
            <option value="distributor" className="bg-neutral-900">Missing Distributor</option>
            <option value="audio" className="bg-neutral-900">Missing Audio</option>
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
          {filteredRows.length} of {allRows.length} records
        </p>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        {filteredRows.length === 0 ? (
          <div className="border border-white/5 py-20 text-center">
            <p className="text-[13px] text-white/20 mb-2">No records match the current filters.</p>
            <button
              onClick={() => {
                setTab("all");
                setFilterArtist("all");
                setFilterType("all");
                setFilterStatus("all");
                setFilterMissing("none");
              }}
              className="text-[10px] tracking-[0.2em] uppercase text-white/20 hover:text-white/50 transition-colors mt-2"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="border border-white/5 overflow-x-auto">
            {/* Column headers */}
            <div className="min-w-[900px] grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
              <span className="col-span-1">Type</span>
              <span className="col-span-2">Title</span>
              <span className="col-span-2">Artist</span>
              <span className="col-span-1">Release</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-1">Date</span>
              <span className="col-span-1">ISRC / UPC</span>
              <span className="col-span-1">Distributor</span>
              <span className="col-span-1">PRO</span>
              <span className="col-span-1" />
            </div>

            {/* Rows */}
            <div className="min-w-[900px] divide-y divide-white/[0.03]">
              {filteredRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                >
                  {/* Type badge */}
                  <span
                    className={`col-span-1 text-[9px] font-mono tracking-wider border px-1.5 py-0.5 w-fit ${kindColor(row.kind)}`}
                  >
                    {row.type}
                  </span>

                  {/* Title + source */}
                  <div className="col-span-2 min-w-0">
                    <p className="text-[11px] text-white/70 truncate">{row.title}</p>
                    {row.source && (
                      <p className="text-[9px] font-mono text-white/20 mt-0.5 truncate">
                        {row.source}
                      </p>
                    )}
                  </div>

                  {/* Artist */}
                  <p className="col-span-2 text-[11px] text-white/40 truncate">
                    {row.artistName}
                  </p>

                  {/* Release */}
                  <p className="col-span-1 text-[10px] font-mono text-white/25 truncate">
                    {row.releaseName ?? "—"}
                  </p>

                  {/* Status */}
                  <span
                    className={`col-span-1 text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 w-fit ${statusColor(row.status)}`}
                  >
                    {row.status}
                  </span>

                  {/* Date */}
                  <p className="col-span-1 text-[10px] font-mono text-white/25">
                    {row.releaseDate ? row.releaseDate.slice(0, 10) : "—"}
                  </p>

                  {/* ISRC / UPC */}
                  <p
                    className={`col-span-1 text-[10px] font-mono truncate ${
                      row.isrc || row.upc ? "text-white/40" : "text-red-400/40"
                    }`}
                  >
                    {row.isrc ?? row.upc ?? "—"}
                  </p>

                  {/* Distributor */}
                  <p
                    className={`col-span-1 text-[10px] truncate ${
                      row.distributor ? "text-white/40" : "text-white/20"
                    }`}
                  >
                    {row.distributor ?? "—"}
                  </p>

                  {/* PRO */}
                  <p className="col-span-1 text-[10px] font-mono text-white/30 truncate">
                    {row.pro ?? "—"}
                  </p>

                  {/* Edit link */}
                  <div className="col-span-1 flex justify-end">
                    <Link
                      href={row.editHref}
                      className="text-[10px] tracking-[0.15em] uppercase text-white/20 hover:text-white transition-colors"
                    >
                      Edit →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
