import { getSpotifyArtist } from "@/lib/spotify";
import { formatFollowers } from "@/lib/spotifyFormat";

interface SpotifyStatsWidgetProps {
  spotifyId: string;
}

export async function SpotifyStatsWidget({ spotifyId }: SpotifyStatsWidgetProps) {
  const artist = await getSpotifyArtist(spotifyId);
  if (!artist) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-[#1DB954]/15 bg-[#1DB954]/[0.04] px-3 py-2.5">
      {/* Spotify logo mark */}
      <svg
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 fill-[#1DB954]/60 flex-none"
        aria-hidden
      >
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307a.75.75 0 01-1.031.25c-2.82-1.724-6.372-2.114-10.556-1.158a.75.75 0 01-.334-1.463c4.578-1.046 8.507-.596 11.672 1.34a.75.75 0 01.249 1.031zm1.471-3.27a.938.938 0 01-1.288.308c-3.226-1.983-8.143-2.558-11.963-1.4a.938.938 0 11-.547-1.795c4.356-1.326 9.774-.684 13.489 1.598a.938.938 0 01.309 1.289zm.126-3.404c-3.868-2.298-10.246-2.51-13.94-1.39a1.125 1.125 0 01-.655-2.153c4.24-1.29 11.29-1.04 15.747 1.608a1.125 1.125 0 01-1.152 1.935z" />
      </svg>

      <span className="text-[10px] uppercase tracking-[0.15em] text-white/35">
        Live
      </span>

      <span className="text-xs font-medium text-white/70">
        {formatFollowers(artist.followers.total)} followers
      </span>

      <span className="text-[10px] text-white/20">·</span>

      <span className="text-xs text-white/40">
        Popularity{" "}
        <span className="font-medium text-white/60">{artist.popularity}</span>
        <span className="text-white/25">/100</span>
      </span>

      {artist.genres[0] && (
        <>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-xs text-white/30 capitalize">{artist.genres[0]}</span>
        </>
      )}

      <a
        href={artist.external_urls.spotify}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto text-[10px] text-[#1DB954]/40 hover:text-[#1DB954] transition-colors flex-none"
        aria-label="Open on Spotify"
      >
        ↗
      </a>
    </div>
  );
}
