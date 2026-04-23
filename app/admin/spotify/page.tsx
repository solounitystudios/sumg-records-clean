import { Suspense } from "react";
import Link from "next/link";
import { getArtists } from "@/lib/db/artists";
import { getSpotifyArtist } from "@/lib/spotify";
import { getArtistSpotifySnapshots } from "@/lib/cms";
import { formatFollowers } from "@/lib/spotifyFormat";
import { SpotifyRefreshButton } from "@/components/admin/SpotifyRefreshButton";
import { SpotifySearchPanel } from "@/components/admin/SpotifySearchPanel";
import type { Artist } from "@/lib/data";

export const metadata = { title: "Spotify Intelligence — SUMG Admin" };

// ─── Spotify icon ─────────────────────────────────────────────────────────────

function SpotifyIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307a.75.75 0 01-1.031.25c-2.82-1.724-6.372-2.114-10.556-1.158a.75.75 0 01-.334-1.463c4.578-1.046 8.507-.596 11.672 1.34a.75.75 0 01.249 1.031zm1.471-3.27a.938.938 0 01-1.288.308c-3.226-1.983-8.143-2.558-11.963-1.4a.938.938 0 11-.547-1.795c4.356-1.326 9.774-.684 13.489 1.598a.938.938 0 01.309 1.289zm.126-3.404c-3.868-2.298-10.246-2.51-13.94-1.39a1.125 1.125 0 01-.655-2.153c4.24-1.29 11.29-1.04 15.747 1.608a1.125 1.125 0 01-1.152 1.935z" />
    </svg>
  );
}

// ─── Per-artist live data row (async — streams independently) ─────────────────

async function LinkedArtistRow({ artist }: { artist: Artist & { spotifyId: string } }) {
  const [spotifyData, snapshots] = await Promise.all([
    getSpotifyArtist(artist.spotifyId),
    getArtistSpotifySnapshots(artist.slug).catch(() => []),
  ]);

  const followers = spotifyData?.followers.total ?? 0;
  const popularity = spotifyData?.popularity ?? 0;
  const genres = spotifyData?.genres ?? [];
  const spotifyUrl = spotifyData?.external_urls.spotify;

  // Trend: delta between two most recent snapshots
  const [latest, previous] = snapshots;
  const trend =
    latest && previous ? latest.followers - previous.followers : null;

  return (
    <div className="flex items-start sm:items-center gap-5 py-4 border-b border-white/[0.05] last:border-0 flex-col sm:flex-row">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <span className="text-sm font-medium text-white/80">{artist.name}</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/30">
            {artist.genre}
          </span>
          {!spotifyData && (
            <span className="text-[10px] text-red-400/50 border border-red-400/20 px-2 py-0.5">
              Unavailable
            </span>
          )}
        </div>
        {spotifyData && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-medium text-white/60">
              {formatFollowers(followers)} followers
            </span>
            <span className="text-[10px] text-white/20">·</span>
            <span className="text-xs text-white/40">
              Pop.{" "}
              <span className="text-white/60">{popularity}</span>
              <span className="text-white/20">/100</span>
            </span>
            {genres[0] && (
              <>
                <span className="text-[10px] text-white/20">·</span>
                <span className="text-[10px] text-white/30 capitalize">{genres[0]}</span>
              </>
            )}
            {trend !== null && (
              <>
                <span className="text-[10px] text-white/20">·</span>
                <span
                  className={`text-[10px] font-medium ${
                    trend > 0
                      ? "text-green-400/70"
                      : trend < 0
                      ? "text-red-400/60"
                      : "text-white/25"
                  }`}
                >
                  {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"}{" "}
                  {trend !== 0
                    ? `${Math.abs(trend).toLocaleString()} vs last`
                    : "no change"}
                </span>
              </>
            )}
            {snapshots.length === 0 && (
              <>
                <span className="text-[10px] text-white/20">·</span>
                <span className="text-[10px] text-white/20 italic">no snapshots yet</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 flex-none flex-wrap">
        <SpotifyRefreshButton artistSlug={artist.slug} />
        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#1DB954]/40 hover:text-[#1DB954] transition-colors"
            aria-label="Open on Spotify"
          >
            ↗
          </a>
        )}
        <Link
          href={`/admin/artists/${artist.slug}/edit`}
          className="text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors"
        >
          Edit
        </Link>
        <Link
          href={`/artists/${artist.slug}`}
          className="text-[10px] tracking-[0.15em] uppercase text-white/20 hover:text-white transition-colors"
        >
          Public →
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SpotifyAdminPage() {
  const artists = await getArtists();

  const linked = artists.filter(
    (a): a is Artist & { spotifyId: string } => !!a.spotifyId
  );
  const unlinked = artists.filter((a) => !a.spotifyId);

  return (
    <main className="px-6 py-10 md:px-10 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <div className="flex items-center gap-3">
          <SpotifyIcon className="w-5 h-5 fill-[#1DB954]/70" />
          <h1 className="text-3xl font-semibold">Spotify Intelligence</h1>
        </div>
        <p className="mt-2 text-sm text-white/50">
          Live artist stats, follower snapshots, and catalog search.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {[
          { label: "Linked Artists", value: linked.length },
          { label: "Unlinked", value: unlinked.length },
          { label: "Total Roster", value: artists.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {/* Linked roster */}
      {linked.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2.5 mb-5">
            <SpotifyIcon className="w-3.5 h-3.5 fill-[#1DB954]/60" />
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Linked Roster</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] px-6">
            {linked.map((artist) => (
              <Suspense
                key={artist.slug}
                fallback={
                  <div className="flex items-center justify-between py-4 border-b border-white/[0.05]">
                    <span className="text-sm text-white/40">{artist.name}</span>
                    <span className="text-xs text-white/15 animate-pulse">Loading…</span>
                  </div>
                }
              >
                <LinkedArtistRow artist={artist} />
              </Suspense>
            ))}
          </div>
        </section>
      )}

      {/* Unlinked roster */}
      {unlinked.length > 0 && (
        <section className="mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4">
            Unlinked Artists
          </p>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5">
            {unlinked.map((artist, i) => (
              <div
                key={artist.slug}
                className={`flex items-center justify-between py-3.5 ${
                  i < unlinked.length - 1 ? "border-b border-white/[0.04]" : ""
                }`}
              >
                <div>
                  <span className="text-sm text-white/60">{artist.name}</span>
                  <span className="ml-3 text-[10px] uppercase tracking-[0.12em] text-white/25">
                    {artist.genre}
                  </span>
                </div>
                <Link
                  href={`/admin/artists/${artist.slug}/edit`}
                  className="text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors border border-white/10 px-3 py-1.5 hover:border-white/25 whitespace-nowrap"
                >
                  Link Spotify →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search */}
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-5">
          Search Spotify Catalog
        </p>
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <SpotifySearchPanel />
        </div>
      </section>
    </main>
  );
}
