/**
 * SpotifyArtistCard
 *
 * Async Server Component — fetches Spotify artist data directly via lib/spotify.ts
 * (server-to-server, no credential exposure) and renders an enrichment widget.
 *
 * Usage:
 *   <SpotifyArtistCard spotifyUrl="https://open.spotify.com/artist/xxx" />
 *   <SpotifyArtistCard spotifyUrl="4dpARuHxo51G3z768sgnrY" />
 *
 * Renders nothing if Spotify credentials are unconfigured or the artist is not found.
 */

import {
  extractSpotifyArtistId,
  getSpotifyArtist,
  getSpotifyArtistTopTracks,
  pickSpotifyImage,
} from "@/lib/spotify";

interface Props {
  /** Full Spotify artist URL or bare Spotify artist ID */
  spotifyUrl: string;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function SpotifyArtistCard({ spotifyUrl }: Props) {
  // Silently skip if credentials are not configured
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return null;
  }

  const artistId = extractSpotifyArtistId(spotifyUrl);

  const [artist, topTracks] = await Promise.all([
    getSpotifyArtist(artistId),
    getSpotifyArtistTopTracks(artistId),
  ]);

  if (!artist) return null;

  const image = pickSpotifyImage(artist.images, 320);
  const displayTracks = topTracks.slice(0, 5);

  return (
    <section className="py-16 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center gap-3 mb-8">
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25">
            On Spotify
          </p>
          {/* Spotify green mark */}
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 fill-[#1DB954]"
            aria-label="Spotify"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307a.75.75 0 01-1.031.25c-2.82-1.724-6.372-2.114-10.556-1.158a.75.75 0 01-.334-1.463c4.578-1.046 8.507-.596 11.672 1.34a.75.75 0 01.249 1.031zm1.471-3.27a.938.938 0 01-1.288.308c-3.226-1.983-8.143-2.558-11.963-1.4a.938.938 0 11-.547-1.795c4.356-1.326 9.774-.684 13.489 1.598a.938.938 0 01.309 1.289zm.126-3.404c-3.868-2.298-10.246-2.51-13.94-1.39a1.125 1.125 0 01-.655-2.153c4.24-1.29 11.29-1.04 15.747 1.608a1.125 1.125 0 01-1.152 1.935z" />
          </svg>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Artist card */}
          <a
            href={artist.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-shrink-0 w-full md:w-52 border border-white/[0.06] hover:border-white/15 transition-colors p-4"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt={artist.name}
                width={image.width ?? 320}
                height={image.height ?? 320}
                className="w-full aspect-square object-cover mb-4 grayscale group-hover:grayscale-0 transition-all duration-500"
              />
            ) : (
              <div className="w-full aspect-square bg-white/[0.04] mb-4 flex items-center justify-center">
                <span className="text-4xl font-black text-white/10">
                  {artist.name.charAt(0)}
                </span>
              </div>
            )}
            <p className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors truncate">
              {artist.name}
            </p>
            <p className="text-[10px] text-white/25 mt-0.5">
              {formatFollowers(artist.followers.total)} followers
            </p>
            {artist.genres.length > 0 && (
              <p className="text-[9px] tracking-[0.1em] uppercase text-white/20 mt-2 truncate">
                {artist.genres.slice(0, 2).join(" · ")}
              </p>
            )}
            <p className="text-[9px] tracking-[0.1em] uppercase text-[#1DB954]/60 mt-3">
              Open on Spotify →
            </p>
          </a>

          {/* Top tracks */}
          {displayTracks.length > 0 && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 mb-4">
                Top Tracks
              </p>
              <div className="space-y-0">
                {displayTracks.map((track, i) => (
                  <a
                    key={track.id}
                    href={track.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 py-3.5 border-b border-white/[0.04] group hover:bg-white/[0.02] px-2 transition-colors"
                  >
                    {/* Track number */}
                    <span className="text-[10px] font-mono text-white/15 min-w-[1.5rem]">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Album art thumbnail */}
                    {track.album.images[2]?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.album.images[2].url}
                        alt={track.album.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 object-cover flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      />
                    )}

                    {/* Title + album */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">
                        {track.name}
                        {track.explicit && (
                          <span className="ml-2 text-[8px] border border-white/10 text-white/20 px-1 py-0.5 align-middle">
                            E
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-white/20 truncate mt-0.5">
                        {track.album.name}
                      </p>
                    </div>

                    {/* Popularity bar */}
                    <div
                      className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0"
                      title={`Popularity: ${track.popularity}/100`}
                    >
                      <div className="w-16 h-px bg-white/[0.06]">
                        <div
                          className="h-full bg-[#1DB954]/40"
                          style={{ width: `${track.popularity}%` }}
                        />
                      </div>
                    </div>

                    {/* Duration */}
                    <span className="text-[10px] font-mono text-white/20 flex-shrink-0">
                      {formatDuration(track.duration_ms)}
                    </span>

                    {/* Spotify link indicator */}
                    <span className="text-[#1DB954]/30 group-hover:text-[#1DB954]/70 transition-colors text-xs flex-shrink-0">
                      ↗
                    </span>
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
