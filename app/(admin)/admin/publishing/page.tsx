"use client";

/**
 * /admin/publishing — Publishing command center.
 *
 * Shows:
 *   A. Publishing Today     — releases/songs with publishAt = today
 *   B. Upcoming (30 days)  — scheduled items in next 30 days
 *   C. Overdue             — past publishAt, still not published
 *   D. Ready to Publish    — readiness score = 100
 *   E. Quick Actions       — Publish Now / Reschedule / Archive / Editor / Copy Link
 *   F. Provider Status     — distributor + DSP links per release
 */

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useCmsStore, isReleasePublic } from "@/lib/cms/store";
import { getReleaseReadiness, getReadinessBadge } from "@/lib/cms/readiness";
import { useRole } from "@/lib/auth/use-role";
import { CMSRelease, CMSSong } from "@/lib/types";
import Link from "next/link";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  return dateStr.slice(0, 10) === isoToday();
}

function isInNext30Days(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + 30);
  return d > now && d <= future;
}

function isOverdue(item: { publishAt?: string; status: string }): boolean {
  if (item.status === "published" || item.status === "archived") return false;
  if (!item.publishAt) return false;
  return new Date(item.publishAt) < new Date();
}

// ─── Row components ───────────────────────────────────────────────────────────

function ReleasePanelRow({
  release,
  allSongs,
  canPublish,
  onPublish,
  onArchive,
}: {
  release: CMSRelease;
  allSongs: CMSSong[];
  canPublish: boolean;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const readiness = getReleaseReadiness(release, allSongs);
  const badge = getReadinessBadge(readiness.score);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/releases/${release.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border border-white/[0.06] p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-white font-medium truncate">{release.title}</p>
          <p className="text-[10px] text-white/30 mt-0.5">
            {release.artistName} · {release.type} ·{" "}
            <span className="font-mono">
              {release.publishAt
                ? new Date(release.publishAt).toLocaleDateString()
                : release.releaseDate || "—"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] tracking-[0.1em] uppercase border px-2 py-0.5 ${badge.colorClass}`}
          >
            {readiness.score}%
          </span>
          <span className="text-[10px] tracking-[0.1em] uppercase border border-white/10 px-2 py-0.5 text-white/30">
            {release.status}
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {canPublish && release.status !== "published" && (
          <button
            onClick={() => onPublish(release.id)}
            className="text-[10px] tracking-[0.15em] uppercase border border-green-800/40 text-green-400/70 px-3 py-1.5 hover:border-green-700/60 hover:text-green-300 transition-colors"
          >
            Publish Now
          </button>
        )}
        {canPublish && release.status !== "archived" && (
          <button
            onClick={() => onArchive(release.id)}
            className="text-[10px] tracking-[0.15em] uppercase border border-white/[0.06] text-white/30 px-3 py-1.5 hover:border-white/15 hover:text-white/60 transition-colors"
          >
            Archive
          </button>
        )}
        <Link
          href={`/admin/releases/${release.slug}`}
          className="text-[10px] tracking-[0.15em] uppercase border border-white/[0.06] text-white/30 px-3 py-1.5 hover:border-white/15 hover:text-white/60 transition-colors"
        >
          Open Editor
        </Link>
        <button
          onClick={copyLink}
          className="text-[10px] tracking-[0.15em] uppercase border border-white/[0.06] text-white/30 px-3 py-1.5 hover:border-white/15 hover:text-white/60 transition-colors"
        >
          {copied ? "Copied ✓" : "Copy Link"}
        </button>
        {isReleasePublic(release) && (
          <a
            href={`/releases/${release.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] tracking-[0.15em] uppercase border border-white/[0.06] text-white/30 px-3 py-1.5 hover:border-white/15 hover:text-white/60 transition-colors"
          >
            View Live ↗
          </a>
        )}
      </div>

      {/* Provider status row */}
      <div className="flex flex-wrap gap-4 text-[10px] text-white/20 font-mono border-t border-white/[0.04] pt-2 mt-1">
        <span>
          Distributor:{" "}
          <span className={release.providerConfig?.distributor ? "text-white/40" : "text-red-400/40"}>
            {release.providerConfig?.distributor ?? "Not set"}
          </span>
        </span>
        <span>
          DSP:{" "}
          <span
            className={
              release.dspLinks &&
              Object.values(release.dspLinks).some(Boolean)
                ? "text-green-400/50"
                : "text-red-400/40"
            }
          >
            {release.dspLinks && Object.values(release.dspLinks).some(Boolean)
              ? `${Object.values(release.dspLinks).filter(Boolean).length} links`
              : "Missing"}
          </span>
        </span>
        {release.providerConfig?.submissionStatus && (
          <span>
            Submission:{" "}
            <span className="text-white/40">
              {release.providerConfig.submissionStatus}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function SongRow({
  song,
  canPublish,
  onPublish,
}: {
  song: CMSSong;
  canPublish: boolean;
  onPublish: (id: string, status: "published" | "archived") => void;
}) {
  return (
    <div className="border border-white/[0.06] px-4 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/70 truncate">{song.title}</p>
        <p className="text-[10px] text-white/25 font-mono">
          {song.artistName} ·{" "}
          {song.publishAt
            ? new Date(song.publishAt).toLocaleDateString()
            : "—"}
        </p>
      </div>
      <span className="text-[10px] tracking-[0.1em] uppercase border border-white/[0.06] px-2 py-0.5 text-white/25">
        {song.status}
      </span>
      {canPublish && song.status !== "published" && (
        <button
          onClick={() => onPublish(song.id, "published")}
          className="text-[10px] tracking-[0.1em] uppercase border border-green-800/30 text-green-400/60 px-3 py-1.5 hover:text-green-300 transition-colors"
        >
          Publish
        </button>
      )}
      <Link
        href={`/admin/songs/${song.slug}`}
        className="text-[10px] text-white/20 hover:text-white transition-colors"
      >
        Edit →
      </Link>
    </div>
  );
}

// ─── Section container ────────────────────────────────────────────────────────

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-[10px] tracking-[0.25em] uppercase text-white/30">
          {title}
        </p>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 border ${
            accent ?? "border-white/10 text-white/20"
          }`}
        >
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-[11px] text-white/20 italic pl-1">
          Nothing here right now.
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublishingPage() {
  const {
    releases,
    songs,
    publishRelease,
    updateRelease,
    updateSong,
    notify,
  } = useCmsStore();
  const role = useRole();
  const canPublish = role.canPublish;

  // ── Computed panels ───────────────────────────────────────────────────────

  const todayReleases = useMemo(
    () =>
      releases.filter(
        (r) =>
          r.status !== "archived" &&
          (isToday(r.publishAt) || isToday(r.releaseDate))
      ),
    [releases]
  );

  const todaySongs = useMemo(
    () =>
      songs.filter(
        (s) => s.status !== "archived" && isToday(s.publishAt)
      ),
    [songs]
  );

  const upcomingReleases = useMemo(
    () =>
      releases
        .filter(
          (r) =>
            r.status !== "archived" &&
            r.status !== "published" &&
            (isInNext30Days(r.publishAt) || isInNext30Days(r.releaseDate))
        )
        .sort(
          (a, b) =>
            new Date(a.publishAt ?? a.releaseDate).getTime() -
            new Date(b.publishAt ?? b.releaseDate).getTime()
        ),
    [releases]
  );

  const upcomingSongs = useMemo(
    () =>
      songs
        .filter(
          (s) =>
            s.status !== "archived" &&
            s.status !== "published" &&
            isInNext30Days(s.publishAt)
        )
        .sort(
          (a, b) =>
            new Date(a.publishAt!).getTime() - new Date(b.publishAt!).getTime()
        ),
    [songs]
  );

  const overdueReleases = useMemo(
    () => releases.filter(isOverdue),
    [releases]
  );

  const overdueSongs = useMemo(
    () => songs.filter(isOverdue),
    [songs]
  );

  const readyReleases = useMemo(
    () =>
      releases.filter((r) => {
        if (r.status === "published") return false;
        const r2 = getReleaseReadiness(r, songs);
        return r2.score === 100;
      }),
    [releases, songs]
  );

  // ── Action handlers ───────────────────────────────────────────────────────

  function handlePublishRelease(id: string) {
    publishRelease(id);
    notify("success", "Release published.");
  }

  function handleArchiveRelease(id: string) {
    const r = releases.find((x) => x.id === id);
    updateRelease(id, { status: "archived", isVisible: false });
    notify("success", `"${r?.title}" archived.`);
  }

  function handlePublishSong(
    id: string,
    status: "published" | "archived"
  ) {
    const s = songs.find((x) => x.id === id);
    updateSong(id, {
      status,
      isVisible: status === "published",
    });
    notify("success", `"${s?.title}" ${status}.`);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const publishedCount = releases.filter((r) => r.status === "published").length;
  const draftCount = releases.filter((r) => r.status === "draft").length;
  const scheduledCount = releases.filter((r) => r.status === "scheduled").length;

  return (
    <AdminShell title="Publishing">
      <div className="max-w-3xl space-y-12">
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-px border border-white/5">
          {[
            { label: "Published", value: publishedCount, color: "text-green-400" },
            { label: "Scheduled", value: scheduledCount, color: "text-yellow-400" },
            { label: "Drafts", value: draftCount, color: "text-white/40" },
          ].map((s) => (
            <div key={s.label} className="px-6 py-4 bg-white/[0.02]">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {!canPublish && (
          <div className="border border-yellow-900/30 bg-yellow-950/10 px-5 py-3 text-[11px] text-yellow-500/60">
            ◌ Your role ({role.roleLabel}) cannot publish releases. Actions are
            visible but disabled.
          </div>
        )}

        {/* A. Publishing Today */}
        <Section
          title="Publishing Today"
          count={todayReleases.length + todaySongs.length}
          accent="border-green-800/40 text-green-400/60"
        >
          {todayReleases.map((r) => (
            <ReleasePanelRow
              key={r.id}
              release={r}
              allSongs={songs}
              canPublish={canPublish}
              onPublish={handlePublishRelease}
              onArchive={handleArchiveRelease}
            />
          ))}
          {todaySongs.map((s) => (
            <SongRow
              key={s.id}
              song={s}
              canPublish={canPublish}
              onPublish={handlePublishSong}
            />
          ))}
        </Section>

        {/* B. Upcoming (30 days) */}
        <Section
          title="Upcoming — Next 30 Days"
          count={upcomingReleases.length + upcomingSongs.length}
          accent="border-yellow-800/40 text-yellow-400/60"
        >
          {upcomingReleases.map((r) => (
            <ReleasePanelRow
              key={r.id}
              release={r}
              allSongs={songs}
              canPublish={canPublish}
              onPublish={handlePublishRelease}
              onArchive={handleArchiveRelease}
            />
          ))}
          {upcomingSongs.map((s) => (
            <SongRow
              key={s.id}
              song={s}
              canPublish={canPublish}
              onPublish={handlePublishSong}
            />
          ))}
        </Section>

        {/* C. Overdue */}
        <Section
          title="Overdue — Past Schedule Date"
          count={overdueReleases.length + overdueSongs.length}
          accent="border-red-800/40 text-red-400/60"
        >
          {overdueReleases.map((r) => (
            <ReleasePanelRow
              key={r.id}
              release={r}
              allSongs={songs}
              canPublish={canPublish}
              onPublish={handlePublishRelease}
              onArchive={handleArchiveRelease}
            />
          ))}
          {overdueSongs.map((s) => (
            <SongRow
              key={s.id}
              song={s}
              canPublish={canPublish}
              onPublish={handlePublishSong}
            />
          ))}
        </Section>

        {/* D. Ready to publish */}
        <Section
          title="Ready to Publish — 100% Readiness"
          count={readyReleases.length}
          accent="border-purple-800/40 text-purple-400/60"
        >
          {readyReleases.map((r) => (
            <ReleasePanelRow
              key={r.id}
              release={r}
              allSongs={songs}
              canPublish={canPublish}
              onPublish={handlePublishRelease}
              onArchive={handleArchiveRelease}
            />
          ))}
        </Section>
      </div>
    </AdminShell>
  );
}
