import { Suspense } from "react";
import {
  getSpotifyArtist,
  extractSpotifyArtistId,
} from "@/lib/spotify";
import { SpotifyEmbed } from "@/components/SpotifyEmbed";
import { formatFollowers } from "@/lib/spotifyFormat";

// ─── Async data wrapper ───────────────────────────────────────────────────────

async function SpotifyArtistCardData({ id }: { id: string }) {
  const artist = await getSpotifyArtist(id);
  if (!artist) return null;

  return (
    <section className="py-20 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            On Spotify
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-white/30">
              {formatFollowers(artist.followers.total)} followers
            </span>
            {artist.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-[10px] tracking-[0.15em] uppercase text-white/20 border border-white/10 px-2 py-0.5"
              >
                {genre}
              </span>
            ))}
            <a
              href={artist.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] tracking-[0.2em] uppercase border border-white/10 text-white/30 px-4 py-2 hover:border-white/30 hover:text-white/70 transition-colors"
            >
              Open ↗
            </a>
          </div>
        </div>

        <SpotifyEmbed type="artist" id={id} height={352} />
      </div>
    </section>
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
