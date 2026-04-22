import Image from "next/image";
import { Suspense } from "react";
import {
  getSpotifyAlbum,
  extractSpotifyAlbumId,
  type SpotifyAlbumFull,
  type SpotifySimpleTrack,
} from "@/lib/spotify";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

// ─── Inner component (pure render) ───────────────────────────────────────────

interface SpotifyReleasePanelInnerProps {
  album: SpotifyAlbumFull;
  hasCoverArt: boolean;
}

function SpotifyReleasePanelInner({ album, hasCoverArt }: SpotifyReleasePanelInnerProps) {
  const image = hasCoverArt ? null : album.images[0];
  const tracks: SpotifySimpleTrack[] = album.tracks?.items ?? [];

  return (
    <section className="py-20 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">
          On Spotify
        </p>

        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Album art (only when no local cover art) */}
          {image && (
            <div className="flex-none">
              <Image
                src={image.url}
                alt={album.name}
                width={160}
                height={160}
                className="w-40 h-40 object-cover border border-white/10 opacity-90"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-1">
                  {album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1)}{" "}
                  · {album.release_date.slice(0, 4)}
                  {album.total_tracks > 0 && ` · ${album.total_tracks} tracks`}
                  {album.label && ` · ${album.label}`}
                </p>
                <h2 className="text-xl font-black tracking-tight text-white">
                  {album.name}
                </h2>
                {album.artists.length > 0 && (
                  <p className="text-[11px] text-white/25 mt-1">
                    {album.artists.map((a) => a.name).join(", ")}
                  </p>
                )}
              </div>

              <a
                href={album.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-[9px] tracking-[0.15em] uppercase text-[#1DB954]/60 hover:text-[#1DB954] transition-colors flex-none"
              >
                Listen on Spotify ↗
              </a>
            </div>

            {/* Tracklist */}
            {tracks.length > 0 && (
              <div className="space-y-0">
                {tracks.map((track) => (
                  <a
                    key={track.id}
                    href={track.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 py-3 border-b border-white/[0.04] group hover:bg-white/[0.02] px-2 transition-colors"
                  >
                    <span className="text-[11px] font-mono text-white/20 min-w-[2rem]">
                      {String(track.track_number).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-sm text-white/60 group-hover:text-white transition-colors truncate">
                      {track.name}
                      {track.explicit && (
                        <span className="ml-2 text-[9px] border border-white/15 text-white/20 px-1.5 py-0.5">
                          E
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-white/25 flex-none">
                      {formatMs(track.duration_ms)}
                    </span>
                    <span className="text-white/10 group-hover:text-white/30 transition-colors text-xs flex-none">
                      ↗
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Async data-fetching wrapper ──────────────────────────────────────────────

async function SpotifyReleasePanelData({ id, hasCoverArt }: { id: string; hasCoverArt: boolean }) {
  const album = await getSpotifyAlbum(id);
  if (!album) return null;
  return <SpotifyReleasePanelInner album={album} hasCoverArt={hasCoverArt} />;
}

// ─── Public component ─────────────────────────────────────────────────────────

interface SpotifyReleasePanelProps {
  spotifyUrl: string;
  hasCoverArt?: boolean;
}

export function SpotifyReleasePanel({ spotifyUrl, hasCoverArt = false }: SpotifyReleasePanelProps) {
  const id = extractSpotifyAlbumId(spotifyUrl);
  if (!id) return null;

  return (
    <Suspense fallback={null}>
      <SpotifyReleasePanelData id={id} hasCoverArt={hasCoverArt} />
    </Suspense>
  );
}
