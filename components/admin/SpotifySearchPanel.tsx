"use client";

import { useState } from "react";
import { formatFollowers, formatMs } from "@/lib/spotifyFormat";

type SearchType = "artist" | "album" | "track";

interface SpotifyImage { url: string }

interface SpotifySearchArtist {
  id: string;
  name: string;
  followers: { total: number };
  images: SpotifyImage[];
  genres: string[];
  external_urls: { spotify: string };
  popularity: number;
}

interface SpotifySearchAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: SpotifyImage[];
  external_urls: { spotify: string };
  artists: Array<{ name: string }>;
}

interface SpotifySearchTrack {
  id: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  artists: Array<{ name: string }>;
  album: { name: string; images: SpotifyImage[] };
}

interface ArtistDetail {
  topTracks: SpotifySearchTrack[];
  albums: SpotifySearchAlbum[];
}

export function SpotifySearchPanel() {
  const [query, setQuery]   = useState("");
  const [type, setType]     = useState<SearchType>("artist");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError]   = useState("");

  const [artists, setArtists] = useState<SpotifySearchArtist[]>([]);
  const [albums, setAlbums]   = useState<SpotifySearchAlbum[]>([]);
  const [tracks, setTracks]   = useState<SpotifySearchTrack[]>([]);

  // Expanded artist detail (one at a time)
  const [expandedArtistId, setExpandedArtistId]     = useState<string | null>(null);
  const [artistDetail, setArtistDetail]             = useState<ArtistDetail | null>(null);
  const [detailLoading, setDetailLoading]           = useState(false);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setStatus("loading");
    setError("");
    setArtists([]); setAlbums([]); setTracks([]);
    setExpandedArtistId(null); setArtistDetail(null);
    try {
      const res = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(q)}&types=${type}&limit=10`
      );
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const json = await res.json();
      setArtists(json.artists?.items ?? []);
      setAlbums(json.albums?.items ?? []);
      setTracks(json.tracks?.items ?? []);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setStatus("error");
    }
  }

  async function handleExpandArtist(artist: SpotifySearchArtist) {
    if (expandedArtistId === artist.id) {
      setExpandedArtistId(null);
      setArtistDetail(null);
      return;
    }
    setExpandedArtistId(artist.id);
    setArtistDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/spotify/artist/${artist.id}`);
      if (!res.ok) throw new Error(`Detail fetch failed (${res.status})`);
      const json = await res.json();
      setArtistDetail({
        topTracks: json.topTracks ?? [],
        albums:    json.albums   ?? [],
      });
    } catch {
      setArtistDetail({ topTracks: [], albums: [] });
    } finally {
      setDetailLoading(false);
    }
  }

  const hasResults = artists.length > 0 || albums.length > 0 || tracks.length > 0;

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SearchType)}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs text-white/60 focus:outline-none focus:border-white/30 transition"
        >
          <option value="artist">Artists</option>
          <option value="album">Albums</option>
          <option value="track">Tracks</option>
        </select>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search Spotify…"
          className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={status === "loading" || !query.trim()}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
        >
          {status === "loading" ? "…" : "Search"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400/70">{error}</p>}

      {/* ── Artist results ── */}
      {artists.length > 0 && (
        <div className="space-y-1">
          {artists.map((artist) => {
            const expanded = expandedArtistId === artist.id;
            return (
              <div key={artist.id} className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
                {/* Row */}
                <button
                  type="button"
                  onClick={() => handleExpandArtist(artist)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition text-left"
                >
                  {artist.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.images[0].url} alt={artist.name} width={40} height={40}
                      className="w-10 h-10 rounded-full object-cover flex-none opacity-75" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex-none flex items-center justify-center">
                      <span className="text-sm font-bold text-white/30">{artist.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{artist.name}</p>
                    <p className="text-xs text-white/30">
                      {formatFollowers(artist.followers.total)} followers
                      {artist.genres[0] && ` · ${artist.genres[0]}`}
                      <span className="ml-2 text-white/20">Pop. {artist.popularity}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-none">
                    <a
                      href={artist.external_urls.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] tracking-[0.15em] uppercase border border-white/10 text-white/30 px-3 py-1.5 hover:border-[#1DB954]/30 hover:text-[#1DB954]/60 transition-colors"
                    >
                      Open ↗
                    </a>
                    <span className="text-white/20 text-xs">{expanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Expanded drill-down */}
                {expanded && (
                  <div className="border-t border-white/[0.06] px-4 py-4 space-y-5">
                    {detailLoading ? (
                      <p className="text-xs text-white/25 animate-pulse">Loading tracks &amp; albums…</p>
                    ) : artistDetail ? (
                      <>
                        {/* Monthly listeners note */}
                        <div className="flex items-center gap-2 text-[10px] text-white/20 border border-white/[0.06] rounded px-3 py-2">
                          <span className="text-white/30">Monthly Listeners</span>
                          <span>—</span>
                          <span>Not available via Spotify public API. Set manually on the artist edit page.</span>
                        </div>

                        {/* Top Tracks */}
                        {artistDetail.topTracks.length > 0 && (
                          <div>
                            <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-3">Top Tracks</p>
                            <div className="space-y-0">
                              {artistDetail.topTracks.slice(0, 5).map((track, i) => (
                                <a
                                  key={track.id}
                                  href={track.external_urls.spotify}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0 group hover:bg-white/[0.02] px-1 transition-colors rounded"
                                >
                                  <span className="text-[10px] text-white/20 w-4 flex-none text-right">{i + 1}</span>
                                  {track.album.images[0] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={track.album.images[0].url} alt={track.album.name}
                                      width={28} height={28}
                                      className="w-7 h-7 object-cover flex-none opacity-60 group-hover:opacity-90 transition-opacity" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/70 group-hover:text-white truncate transition-colors">
                                      {track.name}
                                      {track.explicit && <span className="ml-1.5 text-[8px] border border-white/15 text-white/20 px-1 py-0.5">E</span>}
                                    </p>
                                    <p className="text-[10px] text-white/25 truncate">{track.album.name}</p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-none">
                                    <span className="text-[10px] font-mono text-white/25">{formatMs(track.duration_ms)}</span>
                                    <span className="text-[10px] text-white/20">↗</span>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Albums */}
                        {artistDetail.albums.length > 0 && (
                          <div>
                            <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-3">Albums &amp; Singles</p>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {artistDetail.albums.slice(0, 6).map((album) => (
                                <a
                                  key={album.id}
                                  href={album.external_urls.spotify}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group"
                                  title={`${album.name} (${album.release_date.slice(0, 4)})\n${album.external_urls.spotify}`}
                                >
                                  {album.images[0] ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={album.images[0].url} alt={album.name}
                                      width={120} height={120}
                                      className="w-full aspect-square object-cover opacity-60 group-hover:opacity-90 transition-opacity mb-1.5" />
                                  ) : (
                                    <div className="w-full aspect-square bg-white/[0.03] flex items-center justify-center mb-1.5">
                                      <span className="text-2xl font-black text-white/10">{album.name.charAt(0)}</span>
                                    </div>
                                  )}
                                  <p className="text-[9px] text-white/50 truncate group-hover:text-white/80 transition-colors">{album.name}</p>
                                  <p className="text-[8px] text-white/20">{album.release_date.slice(0, 4)} · {album.album_type}</p>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {artistDetail.topTracks.length === 0 && artistDetail.albums.length === 0 && (
                          <p className="text-xs text-white/25">No tracks or albums found.</p>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Album results ── */}
      {albums.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {albums.map((album) => (
            <a
              key={album.id}
              href={album.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="group border border-white/8 hover:border-white/15 transition-colors overflow-hidden"
              title={album.external_urls.spotify}
            >
              {album.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={album.images[0].url} alt={album.name} width={200} height={200}
                  className="w-full aspect-square object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
              ) : (
                <div className="w-full aspect-square bg-white/[0.03] flex items-center justify-center">
                  <span className="text-3xl font-black text-white/10">{album.name.charAt(0)}</span>
                </div>
              )}
              <div className="p-2.5">
                <p className="text-xs font-medium text-white/60 truncate group-hover:text-white/80 transition-colors">{album.name}</p>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {album.artists[0]?.name} · {album.release_date.slice(0, 4)}
                </p>
                <p className="text-[9px] text-[#1DB954]/30 mt-0.5 truncate">{album.external_urls.spotify}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* ── Track results ── */}
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
              {track.album.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.album.images[0].url} alt={track.album.name} width={36} height={36}
                  className="w-9 h-9 object-cover opacity-60 group-hover:opacity-90 transition-opacity flex-none" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white/60 group-hover:text-white transition-colors truncate block">
                  {track.name}
                  {track.explicit && (
                    <span className="ml-2 text-[9px] border border-white/15 text-white/20 px-1.5 py-0.5">E</span>
                  )}
                </span>
                <span className="text-[10px] text-white/25 truncate block">
                  {track.artists.map((a) => a.name).join(", ")} · {track.album.name}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-none">
                <span className="text-[11px] font-mono text-white/25">{formatMs(track.duration_ms)}</span>
                <span className="text-[9px] text-[#1DB954]/30 hidden lg:block max-w-[180px] truncate">{track.external_urls.spotify}</span>
                <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors">↗</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {status === "done" && !hasResults && (
        <p className="text-xs text-white/30 text-center py-4">No results found.</p>
      )}
    </div>
  );
}
