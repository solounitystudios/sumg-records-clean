/**
 * SpotifyReleasePanel
 *
 * Async Server Component — fetches Spotify album data directly via lib/spotify.ts
 * (server-to-server, no credential exposure) and renders a release enrichment widget.
 *
 * Usage (pass the DSP Spotify link stored on the release):
 *   <SpotifyReleasePanel spotifyUrl={release.dspLinks.spotify} hasCoverArt={!!release.coverArtUrl} />
 *
 * What it shows:
 *   - Spotify album cover (only when the release has no local cover art)
 *   - Spotify album type badge, release date, total track count
 *   - Full tracklist from Spotify (track number, name, duration, explicit badge)
 *   - "Listen on Spotify" CTA button
 *
 * Renders nothing if:
 *   - Credentials are not configured
 *   - The URL/ID is empty or malformed
 *   - Spotify returns no album for the given ID
 */

import {
  extractSpotifyAlbumId,
  getSpotifyAlbum,
  pickSpotifyImage,
} from "@/lib/spotify";

interface Props {
  /** Full Spotify album URL or bare Spotify album ID from release.dspLinks.spotify */
  spotifyUrl: string;
  /** Pass true when the release already has a local cover art URL — suppresses Spotify art */
  hasCoverArt?: boolean;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatReleaseDate(raw: string): string {
  // Spotify returns "YYYY", "YYYY-MM", or "YYYY-MM-DD"
  if (/^\d{4}$/.test(raw)) return raw;
  try {
    return new Date(raw).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      ...(raw.length > 7 ? { day: "numeric" } : {}),
    });
  } catch {
    return raw;
  }
}

export async function SpotifyReleasePanel({ spotifyUrl, hasCoverArt = false }: Props) {
  // Silently skip if credentials are not configured
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return null;
  }

  const albumId = extractSpotifyAlbumId(spotifyUrl);
  // Malformed or empty URL — skip silently rather than making a bad API call
  if (!albumId) return null;

  const album = await getSpotifyAlbum(albumId);
  if (!album) return null;

  const image = hasCoverArt ? undefined : pickSpotifyImage(album.images, 640);
  const tracks = album.tracks.items;

  return (
    <section className="py-16 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-8">
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25">
            On Spotify
          </p>
          {/* Spotify logo */}
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 fill-[#1DB954]"
            aria-label="Spotify"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307a.75.75 0 01-1.031.25c-2.82-1.724-6.372-2.114-10.556-1.158a.75.75 0 01-.334-1.463c4.578-1.046 8.507-.596 11.672 1.34a.75.75 0 01.249 1.031zm1.471-3.27a.938.938 0 01-1.288.308c-3.226-1.983-8.143-2.558-11.963-1.4a.938.938 0 11-.547-1.795c4.356-1.326 9.774-.684 13.489 1.598a.938.938 0 01.309 1.289zm.126-3.404c-3.868-2.298-10.246-2.51-13.94-1.39a1.125 1.125 0 01-.655-2.153c4.24-1.29 11.29-1.04 15.747 1.608a1.125 1.125 0 01-1.152 1.935z" />
          </svg>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left column: cover art (Spotify-sourced) + release metadata */}
          <div className="flex-shrink-0 w-full md:w-52">
            {image ? (
              <a
                href={album.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={album.name}
                  width={image.width ?? 640}
                  height={image.height ?? 640}
                  className="w-full aspect-square object-cover border border-white/[0.06] group-hover:border-white/20 transition-colors"
                />
              </a>
            ) : null}

            {/* Release metadata */}
            <div className={image ? "mt-4 space-y-2" : "space-y-2"}>
              <div className="flex items-center gap-2">
                <span className="text-[9px] tracking-[0.15em] uppercase border border-white/10 text-white/25 px-1.5 py-0.5">
                  {album.album_type}
                </span>
                {album.total_tracks > 0 && (
                  <span className="text-[9px] text-white/20">
                    {album.total_tracks} track{album.total_tracks !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {album.release_date && (
                <p className="text-[10px] text-white/30">
                  {formatReleaseDate(album.release_date)}
                </p>
              )}
              {album.label && (
                <p className="text-[9px] text-white/20 truncate" title={album.label}>
                  {album.label}
                </p>
              )}
              <a
                href={album.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-[9px] tracking-[0.15em] uppercase text-[#1DB954]/60 hover:text-[#1DB954] transition-colors"
              >
                Listen on Spotify ↗
              </a>
            </div>
          </div>

          {/* Right column: Spotify tracklist */}
          {tracks.length > 0 && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 mb-4">
                Tracklist
              </p>
              <div className="space-y-0">
                {tracks.map((track) => (
                  <a
                    key={track.id}
                    href={track.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 py-3.5 border-b border-white/[0.04] group hover:bg-white/[0.02] px-2 transition-colors"
                  >
                    {/* Track number */}
                    <span className="text-[10px] font-mono text-white/15 min-w-[1.5rem]">
                      {String(track.track_number).padStart(2, "0")}
                    </span>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">
                        {track.name}
                        {track.explicit && (
                          <span className="ml-2 text-[8px] border border-white/10 text-white/20 px-1 py-0.5 align-middle">
                            E
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Duration */}
                    <span className="text-[10px] font-mono text-white/20 flex-shrink-0">
                      {formatDuration(track.duration_ms)}
                    </span>

                    {/* Spotify link indicator */}
                    <span className="text-[#1DB954]/20 group-hover:text-[#1DB954]/60 transition-colors text-xs flex-shrink-0">
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
