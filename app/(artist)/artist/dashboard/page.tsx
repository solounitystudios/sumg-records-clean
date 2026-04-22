"use client";

/**
 * /artist/dashboard — Artist Portal Dashboard
 *
 * A premium artist-facing command center that makes signed artists feel
 * connected to a real future label. Surfaces key metrics, upcoming releases,
 * action items, alerts, and self-service tools in one unified view.
 */

import { useMemo, useState } from "react";
import { ArtistShell } from "@/components/artist/ArtistShell";
import { useCmsStore } from "@/lib/cms/store";
import Link from "next/link";

// ─── Mock streaming / financial data ─────────────────────────────────────────
// In production these would come from DSP APIs (Spotify for Artists, Apple Music
// for Artists, DistroKid, etc.). Until those integrations are live, we display
// representative data so the dashboard feels fully operational.

const MOCK_STREAMS = 1_284_307;
const MOCK_FOLLOWERS = 47_830;
const MOCK_MONTHLY_LISTENERS = 92_115;
const MOCK_EARNINGS = 3_842.66;

const MOCK_TOP_CITIES = [
  { city: "New York", country: "US", streams: 142_300, pct: 100 },
  { city: "Los Angeles", country: "US", streams: 118_900, pct: 84 },
  { city: "London", country: "GB", streams: 97_400, pct: 68 },
  { city: "Toronto", country: "CA", streams: 74_100, pct: 52 },
  { city: "Atlanta", country: "US", streams: 61_800, pct: 43 },
  { city: "Chicago", country: "US", streams: 49_200, pct: 35 },
  { city: "Houston", country: "US", streams: 38_700, pct: 27 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "yellow" | "blue" | "purple";
  trend?: "up" | "down" | "flat";
}) {
  const valueClass =
    accent === "green"  ? "text-green-400"
    : accent === "yellow" ? "text-yellow-300"
    : accent === "blue"   ? "text-blue-400"
    : accent === "purple" ? "text-purple-400"
    : "text-white";

  const trendIcon =
    trend === "up"   ? <span className="text-green-400 text-[10px]">↑</span>
    : trend === "down" ? <span className="text-red-400 text-[10px]">↓</span>
    : null;

  return (
    <div className="border border-white/5 p-5 bg-white/[0.01]">
      <p className={`text-3xl font-black mb-1 tabular-nums ${valueClass}`}>{value}</p>
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 flex items-center gap-1.5">
        {label} {trendIcon}
      </p>
      {sub && <p className="text-[10px] text-white/20 mt-1">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, action, actionHref }: { title: string; action?: string; actionHref?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">{title}</p>
      {action && actionHref && (
        <Link
          href={actionHref}
          className="text-[10px] tracking-[0.1em] uppercase text-white/15 hover:text-white/40 transition-colors"
        >
          {action} →
        </Link>
      )}
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  cta,
  onClick,
  href,
  variant,
}: {
  icon: string;
  title: string;
  description: string;
  cta: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "default";
}) {
  const base =
    "border p-5 flex flex-col gap-3 transition-all duration-200 group cursor-pointer";
  const cls =
    variant === "primary"
      ? `${base} border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04]`
      : `${base} border-white/5 hover:border-white/15 hover:bg-white/[0.02]`;

  const inner = (
    <>
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="text-[12px] font-semibold text-white/80 group-hover:text-white transition-colors mb-0.5">
          {title}
        </p>
        <p className="text-[10px] text-white/35 leading-relaxed">{description}</p>
      </div>
      <span className="text-[10px] tracking-[0.15em] uppercase text-white/30 group-hover:text-white/60 transition-colors">
        {cta} →
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

// ─── Upload Song Modal ────────────────────────────────────────────────────────

function UploadSongModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 border border-white/10 p-8 max-w-md w-full text-center space-y-4">
          <p className="text-2xl">✓</p>
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-white/80">
            Song Submitted
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Your track has been received. The SUMG team will review and upload it to your
            catalog within 24–48 hours.
          </p>
          <button
            onClick={onClose}
            className="mt-4 border border-white/10 px-6 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-white/10 p-8 max-w-md w-full space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] tracking-[0.25em] uppercase text-white/60 font-semibold">
            Upload Song
          </p>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] tracking-[0.2em] uppercase text-white/30 mb-1.5">
              Song Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[9px] tracking-[0.2em] uppercase text-white/30 mb-1.5">
              Genre
            </label>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g. Dark R&B"
              className="w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[9px] tracking-[0.2em] uppercase text-white/30 mb-1.5">
              Audio File (MP3 / WAV / FLAC)
            </label>
            <label className="flex items-center justify-center border border-dashed border-white/10 hover:border-white/25 transition-colors p-6 cursor-pointer">
              <input
                type="file"
                accept=".mp3,.wav,.flac,audio/*"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <span className="text-[11px] text-white/60">{file.name}</span>
              ) : (
                <span className="text-[10px] tracking-[0.15em] uppercase text-white/25">
                  Choose file or drag &amp; drop
                </span>
              )}
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/25 hover:border-white/15 hover:text-white/50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 border border-white/20 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/70 hover:border-white/40 hover:text-white transition-all"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Cover Art Request Modal ──────────────────────────────────────────────────

function CoverArtModal({ onClose }: { onClose: () => void }) {
  const [release, setRelease] = useState("");
  const [brief, setBrief] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 border border-white/10 p-8 max-w-md w-full text-center space-y-4">
          <p className="text-2xl">◎</p>
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-white/80">
            Request Submitted
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Your cover art brief has been sent to the SUMG creative team. Expect
            a first concept within 3–5 business days.
          </p>
          <button
            onClick={onClose}
            className="mt-4 border border-white/10 px-6 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-white/10 p-8 max-w-md w-full space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] tracking-[0.25em] uppercase text-white/60 font-semibold">
            Request Cover Art
          </p>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] tracking-[0.2em] uppercase text-white/30 mb-1.5">
              Release / Project Name *
            </label>
            <input
              type="text"
              required
              value={release}
              onChange={(e) => setRelease(e.target.value)}
              placeholder="e.g. Midnight Parallels"
              className="w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[9px] tracking-[0.2em] uppercase text-white/30 mb-1.5">
              Creative Brief
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              placeholder="Describe the mood, color palette, references, or any visual direction..."
              className="w-full bg-white/[0.04] border border-white/10 px-3 py-2.5 text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/25 hover:border-white/15 hover:text-white/50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 border border-white/20 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/70 hover:border-white/40 hover:text-white transition-all"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Go Live Modal ────────────────────────────────────────────────────────────

function GoLiveModal({
  releaseName,
  onClose,
}: {
  releaseName: string;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 border border-green-800/40 p-8 max-w-md w-full text-center space-y-4">
          <p className="text-2xl text-green-400">●</p>
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-green-400">
            Live Request Sent
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            <strong className="text-white/70">{releaseName}</strong> has been
            queued for distribution. The SUMG label team will submit to DSPs and
            confirm delivery within 24 hours.
          </p>
          <button
            onClick={onClose}
            className="mt-4 border border-white/10 px-6 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-white/10 p-8 max-w-md w-full space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] tracking-[0.25em] uppercase text-white/60 font-semibold">
            Go Live
          </p>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="border border-white/5 bg-white/[0.01] p-4 space-y-1">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">Release</p>
          <p className="text-[13px] text-white/80 font-medium">{releaseName}</p>
        </div>

        <p className="text-[11px] text-white/45 leading-relaxed">
          This will notify the SUMG distribution team to submit your release to all
          major DSPs. Ensure your final audio masters and cover art have been
          approved before proceeding.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-white/5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/25 hover:border-white/15 hover:text-white/50 transition-all"
          >
            Not Yet
          </button>
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="flex-1 border border-green-800/50 py-2.5 text-[10px] tracking-[0.2em] uppercase text-green-400/80 hover:border-green-600/60 hover:text-green-400 transition-all"
          >
            Confirm Go Live
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Modal = "upload" | "coverart" | "golive" | null;

export default function ArtistDashboard() {
  const { artists, releases, songs } = useCmsStore();

  // For this portal view, feature the first primary artist as the "signed" artist.
  // In production this would be the authenticated artist user's linked profile.
  const artist = useMemo(
    () => artists.find((a) => a.tier === "primary") ?? artists[0] ?? null,
    [artists]
  );

  // Artist's releases and songs
  const artistReleases = useMemo(
    () => (artist ? releases.filter((r) => r.artistSlug === artist.slug) : releases),
    [artist, releases]
  );
  const artistSongs = useMemo(
    () => (artist ? songs.filter((s) => s.artistSlug === artist.slug) : songs),
    [artist, songs]
  );

  // Next upcoming release (soonest scheduled / draft with a future date)
  const nextRelease = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return artistReleases
      .filter((r) => r.status !== "archived" && r.status !== "published")
      .filter((r) => {
        const d = (r.publishAt ?? r.releaseDate ?? "").slice(0, 10);
        return d >= today;
      })
      .sort((a, b) => {
        const da = (a.publishAt ?? a.releaseDate ?? "");
        const db = (b.publishAt ?? b.releaseDate ?? "");
        return da < db ? -1 : 1;
      })[0] ?? null;
  }, [artistReleases]);

  const countdownDays = useMemo(() => {
    if (!nextRelease) return null;
    const d = nextRelease.publishAt ?? nextRelease.releaseDate;
    if (!d) return null;
    return daysUntil(d);
  }, [nextRelease]);

  // Published / active releases
  const publishedReleases = useMemo(
    () => artistReleases.filter((r) => r.status === "published"),
    [artistReleases]
  );

  // Recent releases (last 3 published)
  const recentReleases = useMemo(
    () =>
      [...artistReleases]
        .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
        .slice(0, 3),
    [artistReleases]
  );

  // Tasks — derived from catalog gaps
  const tasks = useMemo(() => {
    const list: { id: string; label: string; done: boolean; href: string }[] = [];
    const songsWithoutAudio = artistSongs.filter(
      (s) => s.status !== "archived" && !s.audioUrl && !s.mediaAssetId
    );
    if (songsWithoutAudio.length > 0)
      list.push({ id: "t1", label: `Upload audio for ${songsWithoutAudio.length} song${songsWithoutAudio.length > 1 ? "s" : ""}`, done: false, href: "/artist/upload" });

    const releasesWithoutCover = artistReleases.filter(
      (r) => r.status !== "archived" && !r.coverArtUrl
    );
    if (releasesWithoutCover.length > 0)
      list.push({ id: "t2", label: `Add cover art to ${releasesWithoutCover.length} release${releasesWithoutCover.length > 1 ? "s" : ""}`, done: false, href: "/artist/releases" });

    const hasBio = !!artist?.bio && artist.bio.length > 10;
    list.push({ id: "t3", label: "Complete artist bio", done: hasBio, href: "/artist/profile" });

    const hasSpotify = !!(artist?.socialLinks?.spotify || artist?.spotifyId);
    list.push({ id: "t4", label: "Link Spotify artist profile", done: hasSpotify, href: "/artist/profile" });

    const hasInstagram = !!artist?.socialLinks?.instagram;
    list.push({ id: "t5", label: "Add Instagram handle", done: hasInstagram, href: "/artist/profile" });

    if (artistReleases.length > 0)
      list.push({ id: "t6", label: "Schedule next release", done: artistReleases.some((r) => r.status === "scheduled"), href: "/artist/releases" });

    return list;
  }, [artist, artistSongs, artistReleases]);

  const completedTasks = tasks.filter((t) => t.done).length;

  // Alerts
  const alerts = useMemo(() => {
    const list: { id: string; type: "info" | "warning" | "success"; message: string }[] = [];

    if (countdownDays !== null && countdownDays <= 7 && countdownDays >= 0)
      list.push({ id: "a1", type: "warning", message: `"${nextRelease?.title}" drops in ${countdownDays} day${countdownDays !== 1 ? "s" : ""}. Confirm masters are approved.` });

    if (publishedReleases.length > 0)
      list.push({ id: "a2", type: "success", message: `${publishedReleases.length} release${publishedReleases.length > 1 ? "s are" : " is"} live across all DSPs.` });

    list.push({ id: "a3", type: "info", message: "SUMG royalty statements are processed on the 15th of each month." });

    if (tasks.filter((t) => !t.done).length > 0)
      list.push({ id: "a4", type: "info", message: `You have ${tasks.filter((t) => !t.done).length} pending tasks. Complete them to maximize your release readiness.` });

    return list;
  }, [countdownDays, nextRelease, publishedReleases, tasks]);

  const [modal, setModal] = useState<Modal>(null);

  const alertBorder = {
    info:    "border-white/10 bg-white/[0.01]",
    warning: "border-yellow-800/40 bg-yellow-950/10",
    success: "border-green-800/30 bg-green-950/10",
  };
  const alertDot = {
    info:    "bg-white/30",
    warning: "bg-yellow-400",
    success: "bg-green-400",
  };
  const alertText = {
    info:    "text-white/50",
    warning: "text-yellow-300/80",
    success: "text-green-300/80",
  };

  return (
    <ArtistShell title="Dashboard" artistName={artist?.name}>
      <div className="space-y-10">

        {/* ── Welcome header ───────────────────────────────────────────────── */}
        <div className="border-b border-white/5 pb-8">
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-2">
            SUMG Records — Artist Portal
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white/90">
            {artist ? `Welcome back, ${artist.name}.` : "Welcome to your dashboard."}
          </h2>
          {artist && (
            <p className="text-[11px] text-white/35 mt-1">{artist.genre}</p>
          )}
        </div>

        {/* ── Streaming stats ──────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Performance" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total Streams"
              value={fmt(MOCK_STREAMS)}
              sub="All time"
              accent="green"
              trend="up"
            />
            <StatCard
              label="Followers"
              value={fmt(MOCK_FOLLOWERS)}
              sub="Spotify"
              accent="blue"
              trend="up"
            />
            <StatCard
              label="Monthly Listeners"
              value={fmt(MOCK_MONTHLY_LISTENERS)}
              sub="Last 28 days"
              trend="up"
            />
            <StatCard
              label="Est. Earnings"
              value={fmtCurrency(MOCK_EARNINGS)}
              sub="This month"
              accent="yellow"
            />
          </div>
          <p className="text-[9px] text-white/15 mt-2">
            * Streaming and earnings data is representative. DSP integration coming soon.
          </p>
        </div>

        {/* ── Top cities + Release countdown ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Top Cities */}
          <div className="border border-white/5 p-5">
            <SectionHeader title="Top Cities" />
            <div className="space-y-3">
              {MOCK_TOP_CITIES.map((row, i) => (
                <div key={row.city}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-white/20 w-4 tabular-nums">{i + 1}</span>
                      <span className="text-[11px] text-white/65">{row.city}</span>
                      <span className="text-[9px] text-white/25">{row.country}</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/35 tabular-nums">
                      {fmt(row.streams)}
                    </span>
                  </div>
                  <div className="h-[2px] bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/20 rounded-full"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Release Countdown */}
          <div className="border border-white/5 p-5 flex flex-col">
            <SectionHeader title="Next Release" />
            {nextRelease && countdownDays !== null ? (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div
                    className={`inline-flex items-center gap-2 text-[9px] tracking-[0.2em] uppercase border px-2 py-1 mb-4 ${
                      countdownDays <= 7
                        ? "border-yellow-800/40 text-yellow-400/60"
                        : countdownDays <= 30
                        ? "border-blue-800/40 text-blue-400/60"
                        : "border-white/10 text-white/30"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        countdownDays <= 7 ? "bg-yellow-400 animate-pulse" : "bg-white/30"
                      }`}
                    />
                    {nextRelease.status}
                  </div>

                  <p className="text-[11px] text-white/40 mb-1">{nextRelease.type}</p>
                  <p className="text-xl font-black text-white/90 leading-tight mb-2">
                    {nextRelease.title}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {(nextRelease.publishAt ?? nextRelease.releaseDate ?? "").slice(0, 10)}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex items-end gap-2">
                    <span
                      className={`text-5xl font-black tabular-nums ${
                        countdownDays <= 7 ? "text-yellow-300" : "text-white/70"
                      }`}
                    >
                      {countdownDays < 0 ? "0" : countdownDays}
                    </span>
                    <span className="text-[11px] text-white/30 mb-2">
                      {Math.abs(countdownDays) === 1 ? "day" : "days"}{" "}
                      {countdownDays < 0 ? "overdue" : "to go"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                <p className="text-[12px] text-white/20 mb-4">No upcoming releases scheduled.</p>
                <Link
                  href="/artist/releases"
                  className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 border border-white/5 hover:border-white/15 px-4 py-2 transition-all"
                >
                  Schedule a Release
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Releases ──────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="My Releases" action="View all" actionHref="/artist/releases" />
          {recentReleases.length === 0 ? (
            <div className="border border-white/5 py-10 text-center">
              <p className="text-[12px] text-white/20">No releases yet. Upload your first song.</p>
            </div>
          ) : (
            <div className="border border-white/5 divide-y divide-white/[0.04]">
              {recentReleases.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {r.coverArtUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.coverArtUrl}
                        alt={r.title}
                        className="w-9 h-9 object-cover border border-white/5 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 border border-white/5 bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                        <span className="text-white/20 text-xs">◑</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[12px] text-white/70 truncate">{r.title}</p>
                      <p className="text-[10px] text-white/30">{r.type} · {r.genre}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span
                      className={`text-[9px] tracking-[0.15em] uppercase ${
                        r.status === "published"
                          ? "text-green-400/60"
                          : r.status === "scheduled"
                          ? "text-yellow-400/60"
                          : "text-white/25"
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="text-[10px] font-mono text-white/20">
                      {(r.releaseDate ?? r.publishAt ?? "").slice(0, 10) || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Action Center ────────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Action Center" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ActionCard
              icon="▲"
              title="Upload Song"
              description="Submit your audio master to the SUMG catalog for review and distribution."
              cta="Upload now"
              variant="primary"
              onClick={() => setModal("upload")}
            />
            <ActionCard
              icon="◎"
              title="Request Cover Art"
              description="Brief the SUMG creative team on your next release artwork."
              cta="Submit brief"
              onClick={() => setModal("coverart")}
            />
            <ActionCard
              icon="●"
              title="Go Live"
              description={
                nextRelease
                  ? `Submit "${nextRelease.title}" to all DSPs for distribution.`
                  : "Queue your next release for DSP distribution."
              }
              cta="Submit release"
              onClick={() => setModal("golive")}
            />
          </div>
        </div>

        {/* ── Alerts + Tasks ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Alerts */}
          <div className="border border-white/5 p-5">
            <SectionHeader title="Alerts" />
            {alerts.length === 0 ? (
              <p className="text-[11px] text-white/20 italic py-2">No active alerts.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`border px-4 py-3 flex items-start gap-3 ${alertBorder[a.type]}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${alertDot[a.type]}`}
                    />
                    <p className={`text-[11px] leading-relaxed ${alertText[a.type]}`}>
                      {a.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks */}
          <div className="border border-white/5 p-5">
            <SectionHeader title="Tasks" />
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500/60 rounded-full transition-all"
                  style={{ width: tasks.length > 0 ? `${(completedTasks / tasks.length) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-[9px] font-mono text-white/25">
                {completedTasks}/{tasks.length}
              </span>
            </div>
            {tasks.length === 0 ? (
              <p className="text-[11px] text-white/20 italic py-2">All tasks complete ✓</p>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((t) => (
                  <Link
                    key={t.id}
                    href={t.href}
                    className="flex items-center gap-3 py-2 px-1 hover:bg-white/[0.02] transition-colors group rounded"
                  >
                    <span
                      className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center text-[8px] ${
                        t.done
                          ? "border-green-700/50 bg-green-950/30 text-green-400"
                          : "border-white/10"
                      }`}
                    >
                      {t.done ? "✓" : ""}
                    </span>
                    <span
                      className={`text-[11px] ${
                        t.done
                          ? "line-through text-white/20"
                          : "text-white/55 group-hover:text-white/80 transition-colors"
                      }`}
                    >
                      {t.label}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Profile Manager ──────────────────────────────────────────────── */}
        <div className="border border-white/5 p-5">
          <SectionHeader title="Profile" action="Edit profile" actionHref="/artist/profile" />
          {artist ? (
            <div className="flex items-start gap-6">
              {artist.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.profileImageUrl}
                  alt={artist.name}
                  className="w-16 h-16 object-cover border border-white/5 flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 border border-white/5 bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                  <span className="text-white/20 text-xl">◎</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-[15px] font-bold text-white/80">{artist.name}</p>
                  <span
                    className={`text-[9px] tracking-[0.15em] uppercase border px-1.5 py-0.5 ${
                      artist.tier === "primary"
                        ? "border-white/20 text-white/40"
                        : "border-white/10 text-white/25"
                    }`}
                  >
                    {artist.tier}
                  </span>
                </div>
                <p className="text-[11px] text-white/40 mb-2">{artist.genre}</p>
                <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2">
                  {artist.bio || <span className="italic text-white/20">No bio set.</span>}
                </p>

                {/* Social links */}
                {artist.socialLinks && (
                  <div className="flex items-center gap-3 mt-3">
                    {artist.socialLinks.spotify && (
                      <a
                        href={artist.socialLinks.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] tracking-[0.15em] uppercase text-white/25 hover:text-white/50 border border-white/5 px-2 py-1 hover:border-white/15 transition-all"
                      >
                        Spotify
                      </a>
                    )}
                    {artist.socialLinks.instagram && (
                      <a
                        href={`https://instagram.com/${artist.socialLinks.instagram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] tracking-[0.15em] uppercase text-white/25 hover:text-white/50 border border-white/5 px-2 py-1 hover:border-white/15 transition-all"
                      >
                        Instagram
                      </a>
                    )}
                    {artist.socialLinks.soundcloud && (
                      <a
                        href={artist.socialLinks.soundcloud}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] tracking-[0.15em] uppercase text-white/25 hover:text-white/50 border border-white/5 px-2 py-1 hover:border-white/15 transition-all"
                      >
                        SoundCloud
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="hidden md:flex flex-col gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-[13px] font-black text-white/60 tabular-nums">{artistReleases.length}</p>
                  <p className="text-[9px] tracking-[0.15em] uppercase text-white/20">Releases</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-black text-white/60 tabular-nums">{artistSongs.length}</p>
                  <p className="text-[9px] tracking-[0.15em] uppercase text-white/20">Songs</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-black text-green-400/70 tabular-nums">{publishedReleases.length}</p>
                  <p className="text-[9px] tracking-[0.15em] uppercase text-white/20">Live</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-white/20 italic">No artist profile found.</p>
          )}
        </div>

      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modal === "upload" && <UploadSongModal onClose={() => setModal(null)} />}
      {modal === "coverart" && <CoverArtModal onClose={() => setModal(null)} />}
      {modal === "golive" && (
        <GoLiveModal
          releaseName={nextRelease?.title ?? "Next Release"}
          onClose={() => setModal(null)}
        />
      )}
    </ArtistShell>
  );
}
