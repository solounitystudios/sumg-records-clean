import { getSpotifyArtist, getSpotifyArtistTopTracks } from "@/lib/spotify"
import { getArtistSpotifySnapshots } from "@/lib/cms/admin-spotify"
import { formatFollowers, formatMs } from "@/lib/spotifyFormat"
import type { Artist } from "@/lib/data"

export async function SpotifyArtistRow({
  artist,
}: {
  artist: Artist & { spotifyId: string }
}) {
  const [spotifyData, topTracks, snapshots] = await Promise.all([
    getSpotifyArtist(artist.spotifyId),
    getSpotifyArtistTopTracks(artist.spotifyId).catch(() => []),
    getArtistSpotifySnapshots(artist.slug).catch(() => []),
  ])

  const followers  = spotifyData?.followers.total ?? 0
  const popularity = spotifyData?.popularity ?? 0
  const [latest, prev] = snapshots
  const trend = latest && prev ? latest.followers - prev.followers : null

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
      {/* Artist header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/[0.05]">
        <div>
          <p className="text-sm font-semibold">{artist.name}</p>
          <p className="text-xs text-white/35 mt-0.5">{artist.genre}</p>
        </div>
        <div className="flex items-center gap-5 text-right shrink-0">
          {spotifyData ? (
            <>
              <div>
                <p className="text-sm font-medium tabular-nums">{formatFollowers(followers)}</p>
                <p className="text-[10px] text-white/30">followers</p>
              </div>
              <div>
                <p className="text-sm font-medium tabular-nums">{popularity}<span className="text-white/30 text-[10px]">/100</span></p>
                <p className="text-[10px] text-white/30">popularity</p>
              </div>
              {trend !== null && (
                <div>
                  <p className={`text-sm font-medium tabular-nums ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {trend >= 0 ? "+" : ""}{formatFollowers(Math.abs(trend))}
                  </p>
                  <p className="text-[10px] text-white/30">trend</p>
                </div>
              )}
            </>
          ) : (
            <span className="text-[10px] text-red-400/50 border border-red-500/20 px-2 py-0.5 rounded-full">
              API unavailable
            </span>
          )}
        </div>
      </div>

      {/* Top tracks */}
      {topTracks.length > 0 ? (
        <div className="divide-y divide-white/[0.03]">
          {topTracks.slice(0, 5).map((track, i) => (
            <div key={track.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="text-[10px] text-white/20 tabular-nums w-3 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{track.name}</p>
                <p className="text-[10px] text-white/30 truncate">{track.album.name} · {formatMs(track.duration_ms)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Popularity bar */}
                <div className="w-16 bg-white/[0.05] rounded-full h-1">
                  <div
                    className="bg-emerald-400/60 h-1 rounded-full"
                    style={{ width: `${track.popularity}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/30 tabular-nums w-6">{track.popularity}</span>
                {track.explicit && (
                  <span className="text-[8px] text-white/20 border border-white/10 px-1 rounded">E</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-3 text-xs text-white/25">
          {spotifyData ? "No top tracks available." : "Could not fetch track data."}
        </div>
      )}
    </div>
  )
}
