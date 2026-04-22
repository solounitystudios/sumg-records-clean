import Image from "next/image";
import { Suspense } from "react";
import {
  getSpotifyArtist,
  getSpotifyArtistTopTracks,
  getSpotifyArtistAlbums,
  extractSpotifyArtistId,
  type SpotifyArtist,
  type SpotifyTrack,
  type SpotifyAlbum,
} from "@/lib/spotify";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ─── Inner component (pure render) ───────────────────────────────────────────

interface SpotifyArtistCardInnerProps {
  artist: SpotifyArtist;
  topTracks: SpotifyTrack[];
  albums: SpotifyAlbum[];
}

function SpotifyArtistCardInner({ artist, topTracks, albums }: SpotifyArtistCardInnerProps) {
  const image = artist.images[0];

  return (
    <section className="py-20 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">
          On Spotify
        </p>

        {/* Artist header */}
        <div className="flex items-start gap-6 mb-12">
          {image && (
            <Image
              src={image.url}
              alt={artist.name}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover flex-none opacity-90"
            />
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black tracking-tight text-white">
              {artist.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className="text-[11px] text-white/30">
                {formatFollowers(artist.followers.total)} followers
              </span>
              {artist.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="text-[10px] tracking-[0.15em] uppercase text-white/20 border border-white/10 px-2 py-0.5"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <a
            href={artist.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-none text-[10px] tracking-[0.2em] uppercase border border-white/10 text-white/30 px-4 py-2 hover:border-white/30 hover:text-white/70 transition-colors"
          >
            Open in Spotify ↗
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Top tracks */}
          {topTracks.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/20 mb-4">
                Top Tracks
              </p>
              <div className="space-y-0">
                {topTracks.slice(0, 5).map((track, i) => (
                  <a
                    key={track.id}
                    href={track.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 py-3.5 border-b border-white/[0.04] group hover:bg-white/[0.02] px-2 transition-colors"
                  >
                    <span className="text-[11px] font-mono text-white/20 min-w-[1.5rem]">
                      {i + 1}
                    </span>
                    {track.album.images[0] && (
                      <Image
                        src={track.album.images[0].url}
                        alt={track.album.name}
                        width={36}
                        height={36}
                        className="w-9 h-9 object-cover opacity-70 group-hover:opacity-100 transition-opacity flex-none"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white/60 group-hover:text-white transition-colors truncate block">
                        {track.name}
                        {track.explicit && (
                          <span className="ml-2 text-[9px] border border-white/15 text-white/20 px-1.5 py-0.5">
                            E
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-white/20 truncate block">
                        {track.album.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-white/25 flex-none">
                      {formatMs(track.duration_ms)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Popular releases */}
          {albums.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/20 mb-4">
                Popular Releases
              </p>
              <div className="grid grid-cols-2 gap-3">
                {albums.slice(0, 4).map((album) => (
                  <a
                    key={album.id}
                    href={album.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group border border-white/5 hover:border-white/10 transition-colors overflow-hidden"
                  >
                    {album.images[0] ? (
                      <Image
                        src={album.images[0].url}
                        alt={album.name}
                        width={200}
                        height={200}
                        className="w-full aspect-square object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-white/[0.03] flex items-center justify-center">
                        <span className="text-4xl font-black text-white/10">
                          {album.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-white/60 truncate group-hover:text-white/80 transition-colors">
                        {album.name}
                      </p>
                      <p className="text-[10px] text-white/20 mt-0.5">
                        {album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1)}{" "}
                        · {album.release_date.slice(0, 4)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Async data-fetching wrapper ──────────────────────────────────────────────

async function SpotifyArtistCardData({ id }: { id: string }) {
  const [artist, topTracks, albums] = await Promise.all([
    getSpotifyArtist(id),
    getSpotifyArtistTopTracks(id),
    getSpotifyArtistAlbums(id, 4),
  ]);

  if (!artist) return null;

  return (
    <SpotifyArtistCardInner
      artist={artist}
      topTracks={topTracks}
      albums={albums}
    />
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface SpotifyArtistCardProps {
  spotifyUrl: string;
}

export function SpotifyArtistCard({ spotifyUrl }: SpotifyArtistCardProps) {
  const id = extractSpotifyArtistId(spotifyUrl);
  if (!id) return null;

  return (
    <Suspense fallback={null}>
      <SpotifyArtistCardData id={id} />
    </Suspense>
  );
}
