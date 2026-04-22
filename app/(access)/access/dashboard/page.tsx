"use client";

/**
 * /access/dashboard — Role-aware portal home.
 *
 * Artist view: release count, latest song, distribution stats, Spotify snapshot.
 * Staff/admin view: cross-artist catalog overview + release pipeline health.
 */

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

// ─── Shared UI ───────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  href,
  accent,
  sub,
}: {
  label: string;
  value: number | string;
  href: string;
  accent?: "green" | "yellow" | "red";
  sub?: string;
}) {
  const cls =
    accent === "green"
      ? "text-green-400/80"
      : accent === "yellow"
      ? "text-yellow-400/80"
      : accent === "red"
      ? "text-red-400/70"
      : "text-white";

  return (
    <Link
      href={href}
      className="border border-white/5 p-5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-200 block"
    >
      <p className={`text-3xl font-black mb-1 ${cls}`}>{value}</p>
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">{label}</p>
      {sub && <p className="text-[10px] text-white/20 mt-1">{sub}</p>}
    </Link>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <p className="text-[9px] tracking-[0.35em] uppercase text-white/25 mb-4">{label}</p>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="border border-white/5 py-8 text-center">
      <p className="text-[12px] text-white/20">{message}</p>
    </div>
  );
}

// ─── Artist dashboard ────────────────────────────────────────────────────────

function ArtistDashboard({ artistSlug }: { artistSlug: string }) {
  const { artists, releases, songs } = useCmsStore();

  const artist = useMemo(
    () => artists.find((a) => a.slug === artistSlug),
    [artists, artistSlug]
  );

  const myReleases = useMemo(
    () => releases.filter((r) => r.artistSlug === artistSlug),
    [releases, artistSlug]
  );

  const mySongs = useMemo(
    () => songs.filter((s) => s.artistSlug === artistSlug),
    [songs, artistSlug]
  );

  const publishedReleases = myReleases.filter((r) => r.status === "published");
  const draftReleases = myReleases.filter((r) => r.status === "draft");
  const latestRelease = [...myReleases]
    .filter((r) => r.status === "published")
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0];

  const songsWithISRC = mySongs.filter((s) => s.isrc);
  const songsLive = mySongs.filter((s) => s.status === "published");

  const distributionStatuses = myReleases.map(
    (r) => r.distributionRecord?.deliveryStatus
  );
  const liveCount = distributionStatuses.filter((s) => s === "live").length;

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <div>
        <p className="text-[9px] tracking-[0.4em] uppercase text-white/20 mb-2">
          Welcome back
        </p>
        <h2 className="text-2xl font-black tracking-tight text-white">
          {artist?.name ?? artistSlug}
        </h2>
        {artist?.genre && (
          <p className="text-[11px] text-white/35 mt-1">{artist.genre}</p>
        )}
      </div>

      {/* Stats */}
      <div>
        <SectionHead label="Your Catalog" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
          <StatTile
            label="Releases"
            value={myReleases.length}
            href="/access/artist/releases"
          />
          <StatTile
            label="Published"
            value={publishedReleases.length}
            href="/access/artist/releases"
            accent={publishedReleases.length > 0 ? "green" : undefined}
          />
          <StatTile
            label="Songs"
            value={mySongs.length}
            href="/access/artist/songs"
          />
          <StatTile
            label="Live on DSPs"
            value={liveCount}
            href="/access/artist/distribution"
            accent={liveCount > 0 ? "green" : undefined}
          />
        </div>
      </div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Latest release */}
        <div>
          <SectionHead label="Latest Release" />
          {latestRelease ? (
            <Link
              href={`/access/artist/releases/${latestRelease.slug}`}
              className="border border-white/5 p-5 hover:border-white/10 hover:bg-white/[0.02] transition-all block"
            >
              <div className="flex items-start gap-4">
                {latestRelease.coverArtUrl && (
                  <img
                    src={latestRelease.coverArtUrl}
                    alt={latestRelease.title}
                    className="w-16 h-16 object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1">
                    {latestRelease.type}
                  </p>
                  <p className="text-sm font-semibold text-white/80 truncate">
                    {latestRelease.title}
                  </p>
                  <p className="text-[10px] text-white/30 mt-1">
                    {latestRelease.releaseDate.slice(0, 10)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                {latestRelease.dspLinks?.spotify && (
                  <a
                    href={latestRelease.dspLinks.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[9px] tracking-[0.2em] uppercase text-white/30 hover:text-white transition-colors border border-white/10 px-2.5 py-1"
                  >
                    Spotify
                  </a>
                )}
                {latestRelease.dspLinks?.appleMusic && (
                  <a
                    href={latestRelease.dspLinks.appleMusic}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[9px] tracking-[0.2em] uppercase text-white/30 hover:text-white transition-colors border border-white/10 px-2.5 py-1"
                  >
                    Apple
                  </a>
                )}
              </div>
            </Link>
          ) : (
            <EmptyRow message="No published releases yet." />
          )}
        </div>

        {/* Rights & ISRC health */}
        <div>
          <SectionHead label="Rights Health" />
          <div className="border border-white/5 divide-y divide-white/[0.04]">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[11px] text-white/50">ISRC Coverage</p>
              <p
                className={`text-[11px] font-mono ${
                  mySongs.length > 0 && songsWithISRC.length === mySongs.length
                    ? "text-green-400/70"
                    : "text-yellow-400/60"
                }`}
              >
                {songsWithISRC.length} / {mySongs.length}
              </p>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[11px] text-white/50">Songs Live</p>
              <p className="text-[11px] font-mono text-white/40">
                {songsLive.length} / {mySongs.length}
              </p>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[11px] text-white/50">Draft Releases</p>
              <p
                className={`text-[11px] font-mono ${
                  draftReleases.length > 0 ? "text-yellow-400/60" : "text-white/25"
                }`}
              >
                {draftReleases.length}
              </p>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[11px] text-white/50">Royalties</p>
              <Link
                href="/access/artist/royalties"
                className="text-[9px] tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors"
              >
                View →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <SectionHead label="Quick Links" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5">
          {[
            { label: "Edit Profile", href: "/access/artist/profile" },
            { label: "View Analytics", href: "/access/artist/analytics" },
            { label: "Distribution", href: "/access/artist/distribution" },
            { label: "Timeline", href: "/access/artist/timeline" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-black px-5 py-4 hover:bg-white/[0.03] transition-colors"
            >
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 hover:text-white/70 transition-colors">
                {link.label} →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Staff dashboard ─────────────────────────────────────────────────────────

function StaffDashboard() {
  const { artists, releases, songs } = useCmsStore();

  const publishedReleases = releases.filter((r) => r.status === "published");
  const draftReleases = releases.filter((r) => r.status === "draft");
  const scheduledReleases = releases.filter((r) => r.status === "scheduled");

  const songsWithoutISRC = songs.filter((s) => s.status !== "archived" && !s.isrc);

  const recentReleases = [...releases]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[9px] tracking-[0.4em] uppercase text-white/20 mb-2">
          Staff Overview
        </p>
        <h2 className="text-2xl font-black tracking-tight text-white">
          Catalog Health
        </h2>
        <p className="text-[11px] text-white/30 mt-1">
          {artists.length} artists · {releases.length} releases · {songs.length} songs
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
        <StatTile
          label="Published"
          value={publishedReleases.length}
          href="/access/staff/releases"
          accent="green"
        />
        <StatTile
          label="Drafts"
          value={draftReleases.length}
          href="/access/staff/releases"
          accent={draftReleases.length > 0 ? "yellow" : undefined}
        />
        <StatTile
          label="Scheduled"
          value={scheduledReleases.length}
          href="/access/staff/releases"
        />
        <StatTile
          label="Missing ISRC"
          value={songsWithoutISRC.length}
          href="/access/staff/publishing"
          accent={songsWithoutISRC.length > 0 ? "red" : "green"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent activity */}
        <div>
          <SectionHead label="Recent Releases" />
          {recentReleases.length === 0 ? (
            <EmptyRow message="No releases in catalog." />
          ) : (
            <div className="border border-white/5 divide-y divide-white/[0.04]">
              {recentReleases.map((r) => (
                <Link
                  key={r.id}
                  href={`/access/staff/releases`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/60 truncate">{r.title}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{r.artistName}</p>
                  </div>
                  <span
                    className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 flex-shrink-0 ml-3 ${
                      r.status === "published"
                        ? "border-green-800/40 text-green-400/60"
                        : r.status === "draft"
                        ? "border-yellow-800/40 text-yellow-400/60"
                        : r.status === "scheduled"
                        ? "border-blue-800/40 text-blue-400/60"
                        : "border-white/10 text-white/25"
                    }`}
                  >
                    {r.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick nav */}
        <div>
          <SectionHead label="Staff Tools" />
          <div className="grid grid-cols-2 gap-px bg-white/5">
            {[
              { label: "All Artists", href: "/access/staff/artists", icon: "◎" },
              { label: "Release Pipeline", href: "/access/staff/releases", icon: "◑" },
              { label: "Publishing", href: "/access/staff/publishing", icon: "◙" },
              { label: "Distribution", href: "/access/staff/distribution", icon: "▤" },
              { label: "Royalties", href: "/access/staff/royalties", icon: "◎" },
              { label: "Calendar", href: "/access/staff/calendar", icon: "◫" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-black flex items-center gap-3 px-4 py-4 hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-base text-white/25">{link.icon}</span>
                <p className="text-[10px] tracking-[0.15em] uppercase text-white/40">
                  {link.label}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-4">
            <Link
              href="/admin"
              className="flex items-center justify-between border border-white/10 px-4 py-3 hover:border-white/20 hover:bg-white/[0.02] transition-all"
            >
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">
                Open CMS
              </p>
              <span className="text-white/20 text-sm">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAccessUser();

  return (
    <AccessShell
      title="Dashboard"
      breadcrumbs={[{ label: "Access", href: "/access" }, { label: "Dashboard" }]}
    >
      {user.isArtistRole ? (
        user.artistSlug ? (
          <ArtistDashboard artistSlug={user.artistSlug} />
        ) : (
          <div className="py-20 text-center">
            <p className="text-[11px] text-white/30">
              Your account is not linked to an artist profile yet.
              Contact your label manager to get set up.
            </p>
          </div>
        )
      ) : (
        <StaffDashboard />
      )}
    </AccessShell>
  );
}
