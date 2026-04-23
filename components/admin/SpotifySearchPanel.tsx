"use client";

import { useState } from "react";
import { formatFollowers, formatMs } from "@/lib/spotifyFormat";

type SearchType = "artist" | "album" | "track";

interface SpotifySearchArtist {
  id: string;
  name: string;
  followers: { total: number };
  images: Array<{ url: string }>;
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
  images: Array<{ url: string }>;
  external_urls: { spotify: string };
  artists: Array<{ name: string }>;
}

interface SpotifySearchTrack {
  id: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  external_urls: { spotify: string };
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
}

export function SpotifySearchPanel() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("artist");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [artists, setArtists] = useState<SpotifySearchArtist[]>([]);
  const [albums, setAlbums] = useState<SpotifySearchAlbum[]>([]);
  const [tracks, setTracks] = useState<SpotifySearchTrack[]>([]);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setStatus("loading");
    setError("");
    setArtists([]);
    setAlbums([]);
    setTracks([]);
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

      {/* Artist results */}
      {artists.length > 0 && (
        <div className="space-y-2">
          {artists.map((artist) => (
            <div
              key={artist.id}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3"
            >
              {artist.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.images[0].url}
                  alt={artist.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover flex-none opacity-75"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 flex-none flex items-center justify-center">
                  <span className="text-sm font-bold text-white/30">
                    {artist.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{artist.name}</p>
                <p className="text-xs text-white/30">
                  {formatFollowers(artist.followers.total)} followers
                  {artist.genres[0] && ` · ${artist.genres[0]}`}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-none">
                <span className="text-[10px] text-white/25">Pop. {artist.popularity}</span>
                <a
                  href={artist.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] tracking-[0.15em] uppercase border border-white/10 text-white/30 px-3 py-1.5 hover:border-[#1DB954]/30 hover:text-[#1DB954]/60 transition-colors"
                >
                  Open ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Album results */}
      {albums.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {albums.map((album) => (
            <a
              key={album.id}
              href={album.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="group border border-white/8 hover:border-white/15 transition-colors overflow-hidden"
            >
              {album.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={album.images[0].url}
                  alt={album.name}
                  width={200}
                  height={200}
                  className="w-full aspect-square object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="w-full aspect-square bg-white/[0.03] flex items-center justify-center">
                  <span className="text-3xl font-black text-white/10">
                    {album.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="p-2.5">
                <p className="text-xs font-medium text-white/60 truncate group-hover:text-white/80 transition-colors">
                  {album.name}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {album.artists[0]?.name} · {album.release_date.slice(0, 4)}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Track results */}
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
                <img
                  src={track.album.images[0].url}
                  alt={track.album.name}
                  width={36}
                  height={36}
                  className="w-9 h-9 object-cover opacity-60 group-hover:opacity-90 transition-opacity flex-none"
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
                <span className="text-[10px] text-white/25 truncate block">
                  {track.artists.map((a) => a.name).join(", ")} · {track.album.name}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-none">
                <span className="text-[11px] font-mono text-white/25">
                  {formatMs(track.duration_ms)}
                </span>
                <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors">
                  ↗
                </span>
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
