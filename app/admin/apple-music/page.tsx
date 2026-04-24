import Link from "next/link";
import { Suspense } from "react";
import { getArtists } from "@/lib/db/artists";
import { getAllReleasesAdmin } from "@/lib/db/releases";
import { getAllSongs } from "@/lib/db/songs";
import { AppleMusicSearchPanel } from "@/components/admin/AppleMusicSearchPanel";
import type { Artist } from "@/lib/data";
import type { CMSRelease, CMSSong } from "@/lib/types";

export const metadata = { title: "Apple Music — SUMG Admin" };

// ─── Apple Music icon ─────────────────────────────────────────────────────────

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      {sub && <div className="text-[10px] text-white/20 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Linked badge ─────────────────────────────────────────────────────────────

function LinkedBadge({ linked }: { linked: boolean }) {
  return linked ? (
    <span className="text-[9px] uppercase tracking-[0.12em] text-green-400/60 border border-green-500/20 px-2 py-0.5">
      Linked
    </span>
  ) : (
    <span className="text-[9px] uppercase tracking-[0.12em] text-white/20 border border-white/10 px-2 py-0.5">
      Unlinked
    </span>
  );
}

// ─── Artists tab ─────────────────────────────────────────────────────────────

function ArtistsTab({ artists }: { artists: Artist[] }) {
  const linked = artists.filter((a) => a.appleMusicId);
  const unlinked = artists.filter((a) => !a.appleMusicId);

  return (
    <div className="space-y-8">
      {linked.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-4">Linked Artists</p>
          <div className="border border-white/10 bg-[#0d1016]">
            {linked.map((artist, i) => (
              <div
                key={artist.slug}
                className={`flex items-center justify-between px-5 py-4 ${i < linked.length - 1 ? "border-b border-white/[0.05]" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <LinkedBadge linked />
                  <div>
                    <p className="text-sm text-white/80 font-medium">{artist.name}</p>
                    <p className="text-[10px] text-white/30 mt-0.5 font-mono">{artist.appleMusicId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {artist.appleMusicUrl && (
                    <a
                      href={artist.appleMusicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-white/30 hover:text-white transition-colors"
                    >
                      Apple Music ↗
                    </a>
                  )}
                  <Link
                    href={`/admin/artists/${artist.slug}/edit`}
                    className="text-[10px] uppercase tracking-[0.15em] text-white/20 hover:text-white transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {unlinked.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-4">Unlinked Artists</p>
          <div className="border border-white/8 bg-white/[0.015]">
            {unlinked.map((artist, i) => (
              <div
                key={artist.slug}
                className={`flex items-center justify-between px-5 py-3.5 ${i < unlinked.length - 1 ? "border-b border-white/[0.04]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <LinkedBadge linked={false} />
                  <span className="text-sm text-white/50">{artist.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.1em] text-white/20">{artist.genre}</span>
                </div>
                <Link
                  href={`/admin/artists/${artist.slug}/edit`}
                  className="text-[10px] uppercase tracking-[0.15em] text-white/20 hover:text-white transition-colors border border-white/10 px-3 py-1.5 hover:border-white/25"
                >
                  Link →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Releases tab ─────────────────────────────────────────────────────────────

function ReleasesTab({ releases }: { releases: CMSRelease[] }) {
  const linked = releases.filter((r) => r.appleMusicAlbumId);
  const unlinked = releases.filter((r) => !r.appleMusicAlbumId);

  return (
    <div className="space-y-8">
      {linked.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-4">Linked Releases ({linked.length})</p>
          <div className="border border-white/10 bg-[#0d1016]">
            {linked.map((r, i) => (
              <div
                key={r.slug}
                className={`flex items-center justify-between px-5 py-4 ${i < linked.length - 1 ? "border-b border-white/[0.05]" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <LinkedBadge linked />
                  <div>
                    <p className="text-sm text-white/80 font-medium">{r.title}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{r.artistName} · {r.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {r.appleMusicUrl && (
                    <a href={r.appleMusicUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-white/30 hover:text-white transition-colors">
                      Apple Music ↗
                    </a>
                  )}
                  <Link href={`/admin/releases/${r.slug}/edit`}
                    className="text-[10px] uppercase tracking-[0.15em] text-white/20 hover:text-white transition-colors">
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {unlinked.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-4">Unlinked Releases ({unlinked.length})</p>
          <div className="border border-white/8 bg-white/[0.015]">
            {unlinked.map((r, i) => (
              <div
                key={r.slug}
                className={`flex items-center justify-between px-5 py-3.5 ${i < unlinked.length - 1 ? "border-b border-white/[0.04]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <LinkedBadge linked={false} />
                  <div>
                    <span className="text-sm text-white/50">{r.title}</span>
                    <span className="ml-2 text-[10px] text-white/25">{r.artistName}</span>
                  </div>
                </div>
                <Link href={`/admin/releases/${r.slug}/edit`}
                  className="text-[10px] uppercase tracking-[0.15em] text-white/20 hover:text-white transition-colors border border-white/10 px-3 py-1.5 hover:border-white/25">
                  Link →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {linked.length === 0 && unlinked.length === 0 && (
        <p className="text-sm text-white/25 py-8 text-center">No releases found.</p>
      )}
    </div>
  );
}

// ─── Songs tab ────────────────────────────────────────────────────────────────

function SongsTab({ songs }: { songs: CMSSong[] }) {
  const linked = songs.filter((s) => s.appleMusicSongId);
  const unlinked = songs.filter((s) => !s.appleMusicSongId);

  return (
    <div className="space-y-8">
      {linked.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-4">Linked Songs ({linked.length})</p>
          <div className="border border-white/10 bg-[#0d1016]">
            {linked.map((s, i) => (
              <div
                key={s.slug}
                className={`flex items-center justify-between px-5 py-3.5 ${i < linked.length - 1 ? "border-b border-white/[0.05]" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <LinkedBadge linked />
                  <div>
                    <p className="text-sm text-white/75">{s.title}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{s.artistName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.appleMusicUrl && (
                    <a href={s.appleMusicUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-white/30 hover:text-white transition-colors">
                      Apple Music ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {unlinked.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-4">Unlinked Songs ({unlinked.length})</p>
          <div className="border border-white/8 bg-white/[0.015] divide-y divide-white/[0.04]">
            {unlinked.slice(0, 50).map((s) => (
              <div key={s.slug} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <LinkedBadge linked={false} />
                  <span className="text-sm text-white/45">{s.title}</span>
                  <span className="text-[10px] text-white/20">{s.artistName}</span>
                </div>
                {s.dspLinks?.appleMusic && (
                  <span className="text-[10px] text-white/20 font-mono truncate max-w-xs">
                    DSP link set — needs ID
                  </span>
                )}
              </div>
            ))}
          </div>
          {unlinked.length > 50 && (
            <p className="text-[10px] text-white/25 mt-2">+{unlinked.length - 50} more</p>
          )}
        </section>
      )}

      {linked.length === 0 && unlinked.length === 0 && (
        <p className="text-sm text-white/25 py-8 text-center">No songs found.</p>
      )}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  artists,
  releases,
  songs,
}: {
  artists: Artist[];
  releases: CMSRelease[];
  songs: CMSSong[];
}) {
  const linkedArtists = artists.filter((a) => a.appleMusicId).length;
  const linkedReleases = releases.filter((r) => r.appleMusicAlbumId).length;
  const linkedSongs = songs.filter((s) => s.appleMusicSongId).length;

  return (
    <div className="space-y-10">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Artists Linked" value={linkedArtists} sub={`of ${artists.length} total`} />
        <StatCard label="Releases Linked" value={linkedReleases} sub={`of ${releases.length} total`} />
        <StatCard label="Songs Linked" value={linkedSongs} sub={`of ${songs.length} total`} />
      </div>

      {/* Coverage bars */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-5">Link Coverage</p>
        <div className="space-y-4">
          {[
            { label: "Artists", linked: linkedArtists, total: artists.length },
            { label: "Releases", linked: linkedReleases, total: releases.length },
            { label: "Songs", linked: linkedSongs, total: songs.length },
          ].map(({ label, linked, total }) => {
            const pct = total > 0 ? Math.round((linked / total) * 100) : 0;
            return (
              <div key={label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-white/50">{label}</span>
                  <span className="text-xs text-white/30 font-mono">{linked}/{total} ({pct}%)</span>
                </div>
                <div className="h-1 bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-[#fc3c44]/60 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://music.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 border border-white/10 px-5 py-4 hover:border-white/20 transition-colors group"
          >
            <AppleIcon className="w-5 h-5 text-[#fc3c44]/60 group-hover:text-[#fc3c44] transition-colors" />
            <div>
              <p className="text-sm text-white/70 group-hover:text-white transition-colors">Apple Music</p>
              <p className="text-[10px] text-white/25">Browse catalog ↗</p>
            </div>
          </a>
          <a
            href="https://artists.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 border border-white/10 px-5 py-4 hover:border-white/20 transition-colors group"
          >
            <AppleIcon className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" />
            <div>
              <p className="text-sm text-white/70 group-hover:text-white transition-colors">Apple for Artists</p>
              <p className="text-[10px] text-white/25">Analytics dashboard ↗</p>
            </div>
          </a>
        </div>
      </section>

      {/* Setup status */}
      <section className="border border-white/8 bg-white/[0.02] px-6 py-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">API Setup</p>
        <div className="space-y-2">
          {[
            { key: "APPLE_MUSIC_KEY_ID", label: "Key ID" },
            { key: "APPLE_MUSIC_TEAM_ID", label: "Team ID" },
            { key: "APPLE_MUSIC_PRIVATE_KEY", label: "Private Key" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-white/40 min-w-[9rem]">{label}</span>
              <span className="text-[10px] text-white/20">{key}</span>
            </div>
          ))}
          <p className="text-[10px] text-white/20 mt-3 pt-3 border-t border-white/[0.04]">
            Set these env vars to enable live Apple Music catalog search and ID resolution.
          </p>
        </div>
      </section>
    </div>
  );
}

// ─── Tab navigation (client shell) ────────────────────────────────────────────

import { AppleMusicTabs } from "./AppleMusicTabs";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AppleMusicAdminPage() {
  const [artists, releases, songs] = await Promise.all([
    getArtists(),
    getAllReleasesAdmin(),
    getAllSongs(),
  ]);

  const rosterStubs = artists.map((a) => ({ slug: a.slug, name: a.name }));

  const tabs = {
    overview: <OverviewTab artists={artists} releases={releases} songs={songs} />,
    artists: <ArtistsTab artists={artists} />,
    releases: <ReleasesTab releases={releases} />,
    songs: <SongsTab songs={songs} />,
    imports: (
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-5">Search Apple Music Catalog</p>
        <div className="border border-white/10 bg-[#0d1016] p-6">
          <Suspense fallback={<div className="text-xs text-white/25 animate-pulse py-4">Loading…</div>}>
            <AppleMusicSearchPanel artists={rosterStubs} />
          </Suspense>
        </div>
      </section>
    ),
  };

  return (
    <main className="px-6 py-10 md:px-10 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/30 mb-2">Admin</p>
        <div className="flex items-center gap-3">
          <AppleIcon className="w-5 h-5 text-[#fc3c44]/70" />
          <h1 className="text-3xl font-semibold">Apple Music</h1>
        </div>
        <p className="mt-2 text-sm text-white/45">
          Artist linking, catalog search, and streaming analytics.
        </p>
      </div>

      <AppleMusicTabs tabs={tabs} />
    </main>
  );
}
