"use client";

/**
 * /admin/releases/[slug]/command
 *
 * Release Command Center — military-level rollout control for a single release.
 *
 * Read-only panels (link to /admin/releases/[slug] for full edits):
 *   • Release metadata, artist, producers/writers, ISRC/UPC
 *   • Distribution status
 *   • Readiness checklist
 *   • Song roster with per-song ISRC + audio/rights status
 *   • Asset inventory
 *
 * Editable inline:
 *   • Promo planner — add / complete / delete deadline items
 *   • Campaign notes — free-form ops text
 */

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { useCmsStore } from "@/lib/cms/store";
import { getReleaseReadiness } from "@/lib/cms/readiness";
import {
  CMSRelease,
  CMSSong,
  CMSAsset,
  CMSProducer,
  PromoDeadline,
} from "@/lib/types";
import { useRole } from "@/lib/auth/use-role";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

function distroStatusColor(status?: string): string {
  if (!status || status === "draft") return "border-white/10 text-white/30";
  if (status === "queued") return "border-blue-800/40 text-blue-400/60";
  if (status === "submitted") return "border-yellow-800/40 text-yellow-400/60";
  if (status === "delivered") return "border-purple-800/40 text-purple-400/60";
  if (status === "live") return "border-green-800/40 text-green-400/60";
  if (status === "issue") return "border-red-800/40 text-red-400/60";
  return "border-white/10 text-white/30";
}

function getEffectiveLiveStatus(release: CMSRelease): string {
  if (release.distributionRecord?.liveStatus) return release.distributionRecord.liveStatus;
  const sub = release.providerConfig?.submissionStatus;
  if (sub === "distributed") return "live";
  if (sub === "submitted") return "submitted";
  if (sub === "pending") return "queued";
  return "draft";
}

// ─── KPI Tile ────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  colorClass = "text-white/70",
  borderClass = "border-white/5",
}: {
  label: string;
  value: string;
  sub?: string;
  colorClass?: string;
  borderClass?: string;
}) {
  return (
    <div className={`border ${borderClass} bg-white/[0.01] px-4 py-4`}>
      <p className={`text-2xl font-black tabular-nums ${colorClass}`}>{value}</p>
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-white/20 mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-white/5 bg-white/[0.01]">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <p className="text-[10px] tracking-[0.25em] uppercase text-white/30">{title}</p>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Song Row ─────────────────────────────────────────────────────────────────

function SongRow({ song, producers }: { song: CMSSong; producers: CMSProducer[] }) {
  const producerNames = (song.producerSlugs ?? [])
    .map((s) => producers.find((p) => p.slug === s)?.name ?? s)
    .join(", ");

  const rightsStatus = song.rightsMetadata?.compositionStatus ?? "—";
  const hasAudio = Boolean(song.audioUrl);
  const isrc = song.isrc ?? song.rightsMetadata?.source;

  return (
    <div className="grid grid-cols-12 gap-2 py-2.5 border-b border-white/[0.03] last:border-0 items-start">
      <div className="col-span-1 text-[10px] font-mono text-white/25">
        {song.trackNumber ?? "—"}
      </div>
      <div className="col-span-3 min-w-0">
        <Link
          href={`/admin/songs/${song.slug}`}
          className="text-[11px] text-white/70 hover:text-white transition-colors truncate block"
        >
          {song.title}
        </Link>
        {producerNames && (
          <p className="text-[10px] text-white/25 truncate mt-0.5">{producerNames}</p>
        )}
      </div>
      <div className="col-span-2">
        <p className="text-[10px] font-mono text-white/35 truncate">
          {song.isrc ?? "—"}
        </p>
      </div>
      <div className="col-span-2">
        <span
          className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${
            hasAudio
              ? "border-green-800/40 text-green-400/60"
              : "border-red-900/40 text-red-400/50"
          }`}
        >
          {hasAudio ? "Audio ✓" : "No Audio"}
        </span>
      </div>
      <div className="col-span-2">
        <span
          className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${
            rightsStatus === "registered"
              ? "border-green-800/40 text-green-400/60"
              : rightsStatus === "pending"
              ? "border-yellow-800/40 text-yellow-400/60"
              : "border-white/10 text-white/25"
          }`}
        >
          {rightsStatus === "—" ? "Rights —" : rightsStatus}
        </span>
      </div>
      <div className="col-span-2">
        <span
          className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${
            song.status === "published"
              ? "border-green-800/40 text-green-400/60"
              : song.status === "draft"
              ? "border-white/10 text-white/30"
              : "border-yellow-800/40 text-yellow-400/60"
          }`}
        >
          {song.status}
        </span>
      </div>
    </div>
  );
}

// ─── Promo Planner ────────────────────────────────────────────────────────────

const DEADLINE_CATEGORIES: PromoDeadline["category"][] = [
  "asset",
  "distribution",
  "promo",
  "rights",
  "other",
];

function categoryColor(cat?: PromoDeadline["category"]): string {
  switch (cat) {
    case "asset": return "border-blue-800/40 text-blue-400/60";
    case "distribution": return "border-purple-800/40 text-purple-400/60";
    case "promo": return "border-yellow-800/40 text-yellow-400/60";
    case "rights": return "border-orange-800/40 text-orange-400/60";
    default: return "border-white/10 text-white/30";
  }
}

function PromoPlanner({
  deadlines,
  onChange,
}: {
  deadlines: PromoDeadline[];
  onChange: (d: PromoDeadline[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDate, setNewDate] = useState(today());
  const [newCat, setNewCat] = useState<PromoDeadline["category"]>("other");

  const sorted = [...deadlines].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  function addDeadline() {
    if (!newLabel.trim() || !newDate) return;
    const item: PromoDeadline = {
      id: generateId(),
      label: newLabel.trim(),
      dueDate: newDate,
      done: false,
      category: newCat,
    };
    onChange([...deadlines, item]);
    setNewLabel("");
    setNewDate(today());
    setNewCat("other");
    setAdding(false);
  }

  function toggleDone(id: string) {
    onChange(deadlines.map((d) => (d.id === id ? { ...d, done: !d.done } : d)));
  }

  function remove(id: string) {
    onChange(deadlines.filter((d) => d.id !== id));
  }

  const pending = sorted.filter((d) => !d.done);
  const done = sorted.filter((d) => d.done);

  return (
    <div className="space-y-3">
      {/* Pending */}
      {pending.length === 0 && !adding && (
        <p className="text-[11px] text-white/20 italic">No pending deadlines.</p>
      )}
      {pending.map((d) => {
        const days = daysUntil(d.dueDate);
        const overdue = days < 0;
        const urgent = days >= 0 && days <= 3;
        return (
          <div
            key={d.id}
            className="flex items-start gap-3 border border-white/[0.06] px-4 py-3 bg-white/[0.01] group"
          >
            <button
              type="button"
              onClick={() => toggleDone(d.id)}
              className="flex-shrink-0 w-4 h-4 mt-0.5 border border-white/20 hover:border-white/50 transition-colors flex items-center justify-center text-[10px] text-white/40"
              title="Mark complete"
            >
              {" "}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white/80">{d.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-[9px] tracking-[0.1em] border px-1.5 py-0.5 uppercase ${categoryColor(d.category)}`}
                >
                  {d.category ?? "other"}
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    overdue
                      ? "text-red-400/70"
                      : urgent
                      ? "text-yellow-400/70"
                      : "text-white/30"
                  }`}
                >
                  {d.dueDate}
                  {overdue
                    ? ` · ${Math.abs(days)}d overdue`
                    : days === 0
                    ? " · Today"
                    : ` · ${days}d`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(d.id)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[10px] text-red-900 hover:text-red-400 transition-all px-1"
            >
              ✕
            </button>
          </div>
        );
      })}

      {/* Add form */}
      {adding ? (
        <div className="border border-white/10 p-4 space-y-3 bg-white/[0.02]">
          <input
            type="text"
            placeholder="Deadline label…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full bg-transparent border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none"
            autoFocus
          />
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="bg-transparent border border-white/10 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
            />
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as PromoDeadline["category"])}
              className="bg-transparent border border-white/10 px-3 py-2 text-[11px] text-white/60 focus:border-white/30 focus:outline-none"
            >
              {DEADLINE_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-neutral-900 capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addDeadline}
              disabled={!newLabel.trim()}
              className="border border-white/20 px-4 py-1.5 text-[10px] tracking-[0.15em] uppercase text-white/60 hover:border-white/40 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-[10px] tracking-[0.1em] uppercase text-white/25 hover:text-white/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="border border-white/[0.07] px-4 py-2 text-[10px] tracking-[0.15em] uppercase text-white/30 hover:border-white/20 hover:text-white/60 transition-colors w-full text-left"
        >
          + Add Deadline
        </button>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <details className="group">
          <summary className="text-[10px] tracking-[0.15em] uppercase text-white/20 cursor-pointer hover:text-white/40 transition-colors select-none">
            ✓ {done.length} Completed
          </summary>
          <div className="mt-2 space-y-1.5">
            {done.map((d) => (
              <div
                key={d.id}
                className="flex items-start gap-3 border border-white/[0.04] px-4 py-2.5 group/row"
              >
                <button
                  type="button"
                  onClick={() => toggleDone(d.id)}
                  className="flex-shrink-0 w-4 h-4 mt-0.5 border border-green-800/40 bg-green-900/20 flex items-center justify-center text-[10px] text-green-400/60"
                  title="Mark incomplete"
                >
                  ✓
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/25 line-through">{d.label}</p>
                  <span className="text-[10px] font-mono text-white/15">{d.dueDate}</span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  className="opacity-0 group-hover/row:opacity-100 text-[10px] text-red-900/60 hover:text-red-400 transition-all px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Asset Row ───────────────────────────────────────────────────────────────

function AssetRow({ asset, releaseId }: { asset: CMSAsset; releaseId: string }) {
  const attachment = asset.attachedTo?.find(
    (a) => a.entityType === "release" && a.entityId === releaseId
  );
  const icon =
    asset.type === "image"
      ? "◻"
      : asset.type === "audio"
      ? "♫"
      : asset.type === "video"
      ? "▶"
      : "▤";

  return (
    <div className="flex items-center gap-3 border-b border-white/[0.03] py-2 last:border-0">
      <span className="text-white/20 text-sm w-4 flex-shrink-0">{icon}</span>
      <p className="flex-1 text-[11px] text-white/50 truncate">{asset.filename}</p>
      {attachment && (
        <span className="text-[9px] tracking-[0.1em] uppercase border border-white/10 text-white/25 px-1.5 py-0.5">
          {attachment.role}
        </span>
      )}
      <span className="text-[9px] tracking-[0.1em] uppercase border border-white/[0.06] text-white/20 px-1.5 py-0.5">
        {asset.type}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReleaseCommandCenter() {
  const params = useParams();
  const slug = params?.slug as string;

  const {
    getReleaseBySlug,
    updateRelease,
    notify,
    songs,
    producers,
    getAssetsForEntity,
    artists,
  } = useCmsStore();
  const role = useRole();

  const release = getReleaseBySlug(slug);

  // ── Local editable state ────────────────────────────────────────────────────
  const [campaignNotes, setCampaignNotes] = useState("");
  const [promoDeadlines, setPromoDeadlines] = useState<PromoDeadline[]>([]);
  const [saving, setSaving] = useState(false);
  const formInitialized = useRef(false);

  useEffect(() => {
    if (!release || formInitialized.current) return;
    formInitialized.current = true;
    setCampaignNotes(release.campaignNotes ?? "");
    setPromoDeadlines(release.promoDeadlines ?? []);
  }, [release]);

  if (!release) {
    return (
      <AdminShell title="Command Center">
        <p className="text-white/30 text-sm">Release &ldquo;{slug}&rdquo; not found.</p>
        <Link
          href="/admin/releases"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white mt-4 block transition-colors"
        >
          ← Back to Releases
        </Link>
      </AdminShell>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const linkedSongs = songs
    .filter((s) => s.releaseSlug === release.slug)
    .sort((a, b) => (a.trackNumber ?? 99) - (b.trackNumber ?? 99));

  const attachedAssets = getAssetsForEntity("release", release.id);

  const { score, items: readinessItems } = getReleaseReadiness(release, songs);
  const scoreColor =
    score === 100
      ? "text-green-400"
      : score >= 66
      ? "text-yellow-400"
      : "text-red-400";
  const scoreBorder =
    score === 100
      ? "border-green-800/30"
      : score >= 66
      ? "border-yellow-800/30"
      : "border-red-900/30";

  const distroStatus = getEffectiveLiveStatus(release);
  const dspCount = release.dspLinks
    ? Object.values(release.dspLinks).filter(Boolean).length
    : 0;

  const isrc = release.providerConfig?.isrc ?? "—";
  const upc = release.providerConfig?.upc ?? release.distributionRecord?.upc ?? "—";
  const distributor =
    release.distributionRecord?.distributor ??
    release.providerConfig?.distributor ??
    "—";

  const releaseProducers = (release.producerSlugs ?? [])
    .map((s) => producers.find((p) => p.slug === s)?.name ?? s)
    .join(", ");

  const primaryArtist = artists.find((a) => a.slug === release.artistSlug);

  const pendingCount = promoDeadlines.filter((d) => !d.done).length;
  const overdueCount = promoDeadlines.filter(
    (d) => !d.done && daysUntil(d.dueDate) < 0
  ).length;

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!release) return;
    setSaving(true);
    try {
      await updateRelease(release.id, {
        campaignNotes: campaignNotes.trim() || undefined,
        promoDeadlines: promoDeadlines.length ? promoDeadlines : undefined,
      });
      notify("success", "Command Center saved.");
    } catch {
      // bgSync already surfaced an error toast.
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title={`Command — ${release.title}`}>
      <div className="space-y-8 max-w-5xl">

        {/* ── Header bar ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <Link
              href="/admin/releases"
              className="text-[10px] tracking-[0.2em] uppercase text-white/20 hover:text-white transition-colors"
            >
              ← Releases
            </Link>
            <h2 className="text-2xl font-black tracking-tight text-white mt-2">
              {release.title}
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-[11px] text-white/40">{release.artistName}</p>
              <span className="text-white/15">·</span>
              <p className="text-[11px] text-white/30 uppercase tracking-wider">{release.type}</p>
              <span className="text-white/15">·</span>
              <p className="text-[11px] font-mono text-white/30">{release.releaseDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href={`/admin/releases/${release.slug}`}
              className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.15em] uppercase text-white/40 hover:border-white/25 hover:text-white/70 transition-colors"
            >
              Edit Release →
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="border border-white/20 bg-white/[0.04] px-5 py-2 text-[10px] tracking-[0.2em] uppercase text-white/60 hover:border-white/40 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* ── KPI tiles ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiTile
            label="Readiness"
            value={`${score}%`}
            colorClass={scoreColor}
            borderClass={scoreBorder}
          />
          <div className={`border ${distroStatusColor(distroStatus)} bg-white/[0.01] px-4 py-4`}>
            <p className="text-2xl font-black tabular-nums text-inherit capitalize">{distroStatus}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mt-1">Distro</p>
            <p className="text-[10px] font-mono text-white/20 mt-0.5 truncate">{distributor}</p>
          </div>
          <KpiTile
            label="DSP Links"
            value={dspCount.toString()}
            colorClass={dspCount > 0 ? "text-green-400" : "text-white/30"}
          />
          <KpiTile label="ISRC" value={isrc} colorClass="text-white/50" />
          <KpiTile label="UPC" value={upc} colorClass="text-white/50" />
          <KpiTile
            label="Songs"
            value={linkedSongs.length.toString()}
            sub={linkedSongs.filter((s) => s.audioUrl).length + " with audio"}
            colorClass={linkedSongs.length > 0 ? "text-white/70" : "text-red-400/60"}
          />
        </div>

        {/* ── Two-column ops grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Metadata summary */}
            <Section title="Release Metadata">
              <dl className="space-y-2.5">
                <MetaRow label="Title" value={release.title} />
                <MetaRow label="Slug" value={release.slug} mono />
                <MetaRow label="Artist" value={release.artistName} />
                {primaryArtist?.genre && (
                  <MetaRow label="Genre" value={release.genre || primaryArtist.genre} />
                )}
                {!primaryArtist?.genre && release.genre && (
                  <MetaRow label="Genre" value={release.genre} />
                )}
                <MetaRow label="Type" value={release.type} />
                <MetaRow label="Release Date" value={release.releaseDate || "—"} mono />
                <MetaRow
                  label="Producers / Writers"
                  value={releaseProducers || "—"}
                />
                {(release.featuredArtistSlugs ?? []).length > 0 && (
                  <MetaRow
                    label="Featured Artists"
                    value={(release.featuredArtistSlugs ?? []).join(", ")}
                  />
                )}
                <MetaRow label="PRO" value={release.providerConfig?.pro ?? release.rightsMetadata?.pro ?? "—"} />
                <MetaRow label="Publisher" value={release.rightsMetadata?.publisher ?? "—"} />
                <MetaRow
                  label="Status"
                  value={release.status}
                  badge
                  badgeColor={
                    release.status === "published"
                      ? "border-green-800/40 text-green-400/60"
                      : release.status === "scheduled"
                      ? "border-yellow-800/40 text-yellow-400/60"
                      : "border-white/10 text-white/30"
                  }
                />
              </dl>
            </Section>

            {/* Song Roster */}
            <Section
              title={`Song Roster · ${linkedSongs.length}`}
              action={
                <Link
                  href={`/admin/releases/${release.slug}`}
                  className="text-[10px] tracking-[0.1em] uppercase text-white/20 hover:text-white/50 transition-colors"
                >
                  Edit Tracklist →
                </Link>
              }
            >
              {linkedSongs.length === 0 ? (
                <p className="text-[11px] text-white/20 italic">No songs linked yet.</p>
              ) : (
                <div>
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 text-[9px] tracking-[0.15em] uppercase text-white/20 border-b border-white/5 pb-2 mb-1">
                    <span className="col-span-1">#</span>
                    <span className="col-span-3">Title</span>
                    <span className="col-span-2">ISRC</span>
                    <span className="col-span-2">Audio</span>
                    <span className="col-span-2">Rights</span>
                    <span className="col-span-2">Status</span>
                  </div>
                  {linkedSongs.map((s) => (
                    <SongRow key={s.id} song={s} producers={producers} />
                  ))}
                </div>
              )}
            </Section>

            {/* Asset Inventory */}
            <Section
              title={`Assets · ${attachedAssets.length}`}
              action={
                <Link
                  href={`/admin/releases/${release.slug}`}
                  className="text-[10px] tracking-[0.1em] uppercase text-white/20 hover:text-white/50 transition-colors"
                >
                  Manage →
                </Link>
              }
            >
              {attachedAssets.length === 0 ? (
                <p className="text-[11px] text-white/20 italic">No assets attached.</p>
              ) : (
                <div>
                  {attachedAssets.map((a) => (
                    <AssetRow key={a.id} asset={a} releaseId={release.id} />
                  ))}
                </div>
              )}
            </Section>

          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Readiness checklist */}
            <Section title="Readiness Checklist">
              {/* Score bar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/5 relative overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                      score === 100
                        ? "bg-green-500/50"
                        : score >= 66
                        ? "bg-yellow-500/40"
                        : "bg-red-500/30"
                    }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className={`text-[11px] font-mono font-semibold tabular-nums ${scoreColor}`}>
                  {score}%
                </span>
              </div>
              <div className="space-y-2">
                {readinessItems.map((item) => (
                  <div key={item.key} className="flex items-start gap-2.5">
                    <span
                      className={`flex-shrink-0 text-xs mt-0.5 ${
                        item.passed ? "text-green-400/50" : "text-red-400/50"
                      }`}
                    >
                      {item.passed ? "✓" : "✗"}
                    </span>
                    <div>
                      <p
                        className={`text-[11px] leading-snug ${
                          item.passed ? "text-white/35" : "text-white/65"
                        }`}
                      >
                        {item.label}
                      </p>
                      {!item.passed && item.detail && (
                        <p className="text-[10px] text-white/25 mt-0.5">{item.detail}</p>
                      )}
                    </div>
                    <span
                      className={`ml-auto text-[9px] tracking-wider uppercase flex-shrink-0 ${
                        item.severity === "critical"
                          ? "text-red-400/40"
                          : item.severity === "warning"
                          ? "text-yellow-400/30"
                          : "text-white/20"
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Promo Planner */}
            <Section
              title={`Promo Planner${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`}
            >
              <PromoPlanner
                deadlines={promoDeadlines}
                onChange={setPromoDeadlines}
              />
            </Section>

            {/* Distribution detail */}
            <Section
              title="Distribution"
              action={
                <Link
                  href={`/admin/releases/${release.slug}`}
                  className="text-[10px] tracking-[0.1em] uppercase text-white/20 hover:text-white/50 transition-colors"
                >
                  Edit →
                </Link>
              }
            >
              <dl className="space-y-2.5">
                <MetaRow label="Distributor" value={distributor} />
                <MetaRow
                  label="Submission Status"
                  value={
                    release.distributionRecord?.submissionStatus ??
                    release.providerConfig?.submissionStatus ??
                    "—"
                  }
                />
                <MetaRow
                  label="Delivery Status"
                  value={release.distributionRecord?.deliveryStatus ?? "—"}
                />
                <MetaRow
                  label="Live Status"
                  value={release.distributionRecord?.liveStatus ?? "—"}
                  badge
                  badgeColor={distroStatusColor(release.distributionRecord?.liveStatus)}
                />
                <MetaRow
                  label="Scheduled Date"
                  value={
                    release.distributionRecord?.scheduledDate ??
                    release.releaseDate ??
                    "—"
                  }
                  mono
                />
                <MetaRow label="UPC" value={upc} mono />
                <MetaRow label="ISRC (release)" value={isrc} mono />
                <MetaRow
                  label="Distributor Ref ID"
                  value={release.distributionRecord?.distroReferenceId ?? "—"}
                  mono
                />
                {(release.distributionRecord?.dspCoverage ?? []).length > 0 && (
                  <MetaRow
                    label="DSP Coverage"
                    value={(release.distributionRecord?.dspCoverage ?? []).join(", ")}
                  />
                )}
              </dl>
              {(release.distributionRecord?.distroNotes ||
                release.providerConfig?.providerNotes) && (
                <div className="mt-4 border-t border-white/5 pt-3">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 mb-1">
                    Notes
                  </p>
                  <p className="text-[11px] text-white/40 leading-relaxed whitespace-pre-wrap">
                    {release.distributionRecord?.distroNotes ??
                      release.providerConfig?.providerNotes}
                  </p>
                </div>
              )}
            </Section>

            {/* Campaign Notes */}
            <Section title="Campaign Notes">
              <textarea
                rows={6}
                value={campaignNotes}
                onChange={(e) => setCampaignNotes(e.target.value)}
                placeholder="Rollout strategy, talking points, sync opportunities, key contacts, campaign phases…"
                className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white/70 placeholder-white/15 focus:border-white/30 focus:outline-none resize-none leading-relaxed"
              />
              <p className="text-[10px] text-white/15 mt-2">
                Internal ops notes — not visible on the public site. Hit Save to persist.
              </p>
            </Section>

          </div>
        </div>

        {/* ── Save footer ──────────────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-white/20">
            Saves campaign notes + promo deadlines only. All other changes are made via{" "}
            <Link
              href={`/admin/releases/${release.slug}`}
              className="text-white/35 hover:text-white transition-colors underline underline-offset-2"
            >
              the release editor
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !role.canEditContent}
            className="border border-white/20 px-6 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/60 hover:border-white/40 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Command Center"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

// ─── Tiny metadata row ────────────────────────────────────────────────────────

function MetaRow({
  label,
  value,
  mono,
  badge,
  badgeColor,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: boolean;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <dt className="text-[10px] tracking-[0.12em] uppercase text-white/20 w-32 flex-shrink-0 pt-0.5">
        {label}
      </dt>
      <dd className="flex-1 min-w-0">
        {badge ? (
          <span
            className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${badgeColor}`}
          >
            {value}
          </span>
        ) : (
          <span
            className={`text-[12px] ${mono ? "font-mono text-white/45" : "text-white/55"} break-all`}
          >
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}
