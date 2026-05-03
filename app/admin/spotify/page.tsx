import { Suspense } from "react";
import Link from "next/link";
import { getArtists } from "@/lib/db/artists";
import { getSpotifyArtist, getSpotifyArtistTopTracks, pickSpotifyImage } from "@/lib/spotify";
import { getArtistSpotifySnapshots } from "@/lib/cms";
import { formatFollowers } from "@/lib/spotifyFormat";
import { SpotifyRefreshButton } from "@/components/admin/SpotifyRefreshButton";
import { SpotifySearchPanel } from "@/components/admin/SpotifySearchPanel";
import type { Artist } from "@/lib/data";

export const metadata = { title: "Spotify Intelligence — SUMG Admin" };

function SpotifyIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307a.75.75 0 01-1.031.25c-2.82-1.724-6.372-2.114-10.556-1.158a.75.75 0 01-.334-1.463c4.578-1.046 8.507-.596 11.672 1.34a.75.75 0 01.249 1.031zm1.471-3.27a.938.938 0 01-1.288.308c-3.226-1.983-8.143-2.558-11.963-1.4a.938.938 0 11-.547-1.795c4.356-1.326 9.774-.684 13.489 1.598a.938.938 0 01.309 1.289zm.126-3.404c-3.868-2.298-10.246-2.51-13.94-1.39a1.125 1.125 0 01-.655-2.153c4.24-1.29 11.29-1.04 15.747 1.608a1.125 1.125 0 01-1.152 1.935z" />
    </svg>
  );
}

function msToMin(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Top tracks strip (async, loads independently) ────────────────────────────

async function ArtistTopTracks({ spotifyId }: { spotifyId: string }) {
  const tracks = await getSpotifyArtistTopTracks(spotifyId);
  if (!tracks.length) return null;

  return (
    <div className="mt-4 border-t border-white/[0.05] pt-4">
      <p className="text-[9px] uppercase tracking-[0.25em] text-white/20 mb-2.5 font-mono">Top Tracks</p>
      <div className="space-y-1.5">
        {tracks.slice(0, 5).map((track, i) => (
          <a
            key={track.id}
            href={track.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 group px-2 py-1.5 -mx-2 rounded-lg hover:bg-white/[0.04] transition-all duration-150"
          >
            <span className="text-[9px] font-mono text-white/20 w-4 shrink-0 text-right">{i + 1}</span>
            <span className="flex-1 text-xs text-white/60 truncate group-hover:text-white/80 transition-colors duration-150">
              {track.name}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-1 w-14 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1DB954]/40 group-hover:bg-[#1DB954]/60 transition-colors duration-150"
                  style={{ width: `${track.popularity}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-white/25 w-6 text-right">{track.popularity}</span>
            </div>
            <span className="text-[9px] font-mono text-white/20 w-8 text-right">{msToMin(track.duration_ms)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Per-artist card (async — streams independently) ─────────────────────────

async function LinkedArtistCard({ artist }: { artist: Artist & { spotifyId: string } }) {
  const [spotifyData, snapshots] = await Promise.all([
    getSpotifyArtist(artist.spotifyId),
    getArtistSpotifySnapshots(artist.slug).catch(() => []),
  ]);

  const followers   = spotifyData?.followers.total ?? 0;
  const popularity  = spotifyData?.popularity ?? 0;
  const genres      = spotifyData?.genres ?? [];
  const spotifyUrl  = spotifyData?.external_urls.spotify;
  const image       = spotifyData ? pickSpotifyImage(spotifyData.images, 300) : undefined;

  const [latest, previous] = snapshots;
  const trend = latest && previous ? latest.followers - previous.followers : null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0c10] p-5 hover:border-white/[0.14] transition-all duration-150">
      <div className="flex items-start gap-4">
        {/* Artist image */}
        <div className="shrink-0">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={artist.name}
              className="w-14 h-14 rounded-xl object-cover"
              style={{ border: "1px solid rgba(29,185,84,0.15)" }}
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <span className="text-xl font-semibold text-white/20">{artist.name.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Data block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white/90">{artist.name}</span>
                <span className="text-[9px] uppercase tracking-[0.15em] text-white/25 font-mono">{artist.genre}</span>
                {!spotifyData && (
                  <span className="text-[9px] text-red-400/50 border border-red-400/20 px-2 py-0.5 rounded font-mono">
                    Unavailable
                  </span>
                )}
              </div>

              {spotifyData && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div>
                    <div className="text-[9px] text-white/25 font-mono uppercase tracking-wider mb-0.5">Followers</div>
                    <div className="text-sm font-semibold font-mono tabular-nums text-white/80">
                      {formatFollowers(followers)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-white/25 font-mono uppercase tracking-wider mb-0.5">Popularity</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1DB954]/50"
                          style={{ width: `${popularity}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold font-mono tabular-nums text-white/60">
                        {popularity}<span className="text-white/20">/100</span>
                      </span>
                    </div>
                  </div>
                  {genres[0] && (
                    <div>
                      <div className="text-[9px] text-white/25 font-mono uppercase tracking-wider mb-0.5">Genre</div>
                      <div className="text-xs text-white/40 capitalize">{genres[0]}</div>
                    </div>
                  )}
                  {artist.monthlyListeners > 0 && (
                    <div>
                      <div className="text-[9px] text-white/25 font-mono uppercase tracking-wider mb-0.5">Monthly</div>
                      <div className="text-xs font-mono tabular-nums text-white/50">{formatFollowers(artist.monthlyListeners)}</div>
                    </div>
                  )}
                  {trend !== null && (
                    <div>
                      <div className="text-[9px] text-white/25 font-mono uppercase tracking-wider mb-0.5">Trend</div>
                      <div className={`text-xs font-semibold font-mono tabular-nums ${trend > 0 ? "text-emerald-400/80" : trend < 0 ? "text-red-400/60" : "text-white/25"}`}>
                        {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {trend !== 0 ? Math.abs(trend).toLocaleString() : "flat"}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-none flex-wrap">
              <SpotifyRefreshButton artistSlug={artist.slug} />
              {spotifyUrl && (
                <a
                  href={spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-[#1DB954]/40 hover:text-[#1DB954] transition-colors duration-150 border border-[#1DB954]/15 hover:border-[#1DB954]/40 px-2.5 py-1 rounded"
                  aria-label="Open on Spotify"
                >
                  Spotify ↗
                </a>
              )}
              <Link
                href={`/admin/artists/${artist.slug}/edit`}
                className="text-[9px] font-mono tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors duration-150 border border-white/[0.08] hover:border-white/20 px-2.5 py-1 rounded"
              >
                Edit
              </Link>
            </div>
          </div>

          {/* Top tracks inline */}
          {spotifyData && (
            <Suspense
              fallback={
                <div className="mt-4 border-t border-white/[0.05] pt-4">
                  <div className="text-[9px] font-mono text-white/15 animate-pulse">Loading tracks…</div>
                </div>
              }
            >
              <ArtistTopTracks spotifyId={artist.spotifyId} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SpotifyAdminPage() {
  const artists = await getArtists();

  const linked   = artists.filter((a): a is Artist & { spotifyId: string } => !!a.spotifyId);
  const unlinked = artists.filter((a) => !a.spotifyId);

  return (
    <main className="px-6 py-10 md:px-10 max-w-5xl">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / DSP</p>
          <div className="flex items-center gap-3">
            <SpotifyIcon className="w-5 h-5 fill-[#1DB954]/70" />
            <h1 className="text-3xl font-semibold tracking-tight">Spotify Intelligence</h1>
          </div>
          <p className="mt-2 text-sm text-white/40">
            Live artist stats · follower snapshots · top tracks · catalog search
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1DB954] animate-pulse" />
          <span className="text-[10px] font-mono text-[#1DB954]/60 tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { label: "Linked Artists", value: linked.length, color: "text-[#1DB954]", border: "border-[#1DB954]/15" },
          { label: "Unlinked", value: unlinked.length, color: unlinked.length > 0 ? "text-amber-400/80" : "text-white/40", border: "border-white/[0.08]" },
          { label: "Total Roster", value: artists.length, color: "text-white/70", border: "border-white/[0.08]" },
        ].map(({ label, value, color, border }) => (
          <div key={label} className={`rounded-2xl border ${border} bg-white/[0.02] p-5`}>
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/30 mb-2 font-mono">{label}</div>
            <div className={`text-2xl font-semibold tabular-nums font-mono ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Linked roster */}
      {linked.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2.5 mb-5">
            <SpotifyIcon className="w-3.5 h-3.5 fill-[#1DB954]/60" />
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/35 font-mono">Linked Roster</p>
            <span className="text-[9px] font-mono text-white/20">— {linked.length} artist{linked.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-3">
            {linked.map((artist) => (
              <Suspense
                key={artist.slug}
                fallback={
                  <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-white/[0.04] animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-3 w-32 bg-white/[0.06] rounded animate-pulse" />
                        <div className="h-2 w-48 bg-white/[0.04] rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                }
              >
                <LinkedArtistCard artist={artist} />
              </Suspense>
            ))}
          </div>
        </section>
      )}

      {/* Unlinked roster */}
      {unlinked.length > 0 && (
        <section className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4 font-mono">
            Unlinked Artists
          </p>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] divide-y divide-white/[0.04]">
            {unlinked.map((artist) => (
              <div
                key={artist.slug}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-all duration-150"
              >
                <div>
                  <span className="text-sm text-white/60">{artist.name}</span>
                  <span className="ml-3 text-[9px] uppercase tracking-[0.15em] text-white/25 font-mono">
                    {artist.genre}
                  </span>
                </div>
                <Link
                  href={`/admin/artists/${artist.slug}/edit`}
                  className="text-[9px] font-mono tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors duration-150 border border-white/[0.08] hover:border-white/25 px-3 py-1.5 rounded whitespace-nowrap"
                >
                  Link Spotify →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catalog search */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35 mb-5 font-mono">
          Search Spotify Catalog
        </p>
        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0c10] p-6">
          <SpotifySearchPanel />
        </div>
      </section>
    </main>
  );
}
