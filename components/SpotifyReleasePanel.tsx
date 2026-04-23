import { Suspense } from "react";
import {
  getSpotifyAlbum,
  extractSpotifyAlbumId,
} from "@/lib/spotify";
import { SpotifyEmbed } from "@/components/SpotifyEmbed";

// ─── Async data wrapper ───────────────────────────────────────────────────────

async function SpotifyReleasePanelData({ id }: { id: string }) {
  const album = await getSpotifyAlbum(id);
  if (!album) return null;

  const meta = [
    album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1),
    album.release_date.slice(0, 4),
    album.total_tracks > 0 ? `${album.total_tracks} tracks` : null,
    album.label ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="py-20 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            On Spotify
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-white/30">{meta}</span>
            <a
              href={album.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] tracking-[0.2em] uppercase border border-white/10 text-white/30 px-4 py-2 hover:border-white/30 hover:text-white/70 transition-colors"
            >
              Open ↗
            </a>
          </div>
        </div>

        <SpotifyEmbed type="album" id={id} height={352} />
      </div>
    </section>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface SpotifyReleasePanelProps {
  spotifyUrl: string;
  hasCoverArt?: boolean;
}

export function SpotifyReleasePanel({ spotifyUrl }: SpotifyReleasePanelProps) {
  const id = extractSpotifyAlbumId(spotifyUrl);
  if (!id) return null;

  return (
    <Suspense fallback={null}>
      <SpotifyReleasePanelData id={id} />
    </Suspense>
  );
}
