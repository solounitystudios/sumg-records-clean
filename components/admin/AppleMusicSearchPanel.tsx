"use client";

import { useState } from "react";

type SearchType = "artists" | "albums" | "songs";

interface AMSearchArtist {
  id: string;
  attributes: {
    name: string;
    genreNames: string[];
    url: string;
    artwork?: { url: string; width: number; height: number };
  };
}

interface AMSearchAlbum {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    releaseDate: string;
    trackCount: number;
    url: string;
    artwork?: { url: string; width: number; height: number };
  };
}

interface AMSearchSong {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    durationInMillis: number;
    url: string;
    artwork?: { url: string; width: number; height: number };
    contentRating?: string;
  };
}

function artworkUrl(artwork: { url: string } | undefined, size = 60): string | null {
  if (!artwork) return null;
  return artwork.url.replace("{w}", String(size)).replace("{h}", String(size));
}

function msToTime(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function LinkBtn({
  id,
  linking,
  linkStatus,
  onClick,
}: {
  id: string;
  linking: string | null;
  linkStatus: Record<string, "ok" | "err">;
  onClick: () => void;
}) {
  const ls = linkStatus[id];
  return (
    <button
      type="button"
      disabled={linking === id || ls === "ok"}
      onClick={onClick}
      className={`text-[10px] border px-3 py-1.5 transition-colors flex-none ${
        ls === "ok"
          ? "border-green-500/30 text-green-400/60"
          : ls === "err"
          ? "border-red-500/30 text-red-400/60"
          : "border-white/10 text-white/30 hover:border-white/30 hover:text-white disabled:opacity-40"
      }`}
    >
      {ls === "ok" ? "Linked ✓" : ls === "err" ? "Failed" : linking === id ? "…" : "Link"}
    </button>
  );
}

interface Props {
  artists?: Array<{ slug: string; name: string }>;
  releases?: Array<{ slug: string; title: string; artistName: string }>;
  songs?: Array<{ slug: string; title: string; artistName: string }>;
}

export function AppleMusicSearchPanel({ artists = [], releases = [], songs = [] }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("artists");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [amArtists, setAmArtists] = useState<AMSearchArtist[]>([]);
  const [amAlbums, setAmAlbums] = useState<AMSearchAlbum[]>([]);
  const [amSongs, setAmSongs] = useState<AMSearchSong[]>([]);
  const [linking, setLinking] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<Record<string, "ok" | "err">>({});
  const [selectedArtistSlug, setSelectedArtistSlug] = useState("");
  const [selectedReleaseSlug, setSelectedReleaseSlug] = useState("");
  const [selectedSongSlug, setSelectedSongSlug] = useState("");

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setStatus("loading");
    setError("");
    setAmArtists([]);
    setAmAlbums([]);
    setAmSongs([]);
    try {
      const res = await fetch(
        `/api/apple-music/search?q=${encodeURIComponent(q)}&types=${type}&limit=10`
      );
      if (!res.ok) {
        if (res.status === 503) throw new Error("Apple Music credentials not configured");
        throw new Error(`Search failed (${res.status})`);
      }
      const json = await res.json();
      setAmArtists(json.artists?.data ?? []);
      setAmAlbums(json.albums?.data ?? []);
      setAmSongs(json.songs?.data ?? []);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setStatus("error");
    }
  }

  async function linkArtist(item: AMSearchArtist) {
    if (!selectedArtistSlug) { setError("Select a SUMG artist first"); return; }
    setLinking(item.id);
    try {
      const res = await fetch("/api/apple-music/link-artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistSlug: selectedArtistSlug, appleMusicId: item.id, appleMusicUrl: item.attributes.url }),
      });
      if (!res.ok) throw new Error("Link failed");
      setLinkStatus((prev) => ({ ...prev, [item.id]: "ok" }));
    } catch {
      setLinkStatus((prev) => ({ ...prev, [item.id]: "err" }));
    } finally {
      setLinking(null);
    }
  }

  async function linkAlbum(item: AMSearchAlbum) {
    if (!selectedReleaseSlug) { setError("Select a SUMG release first"); return; }
    setLinking(item.id);
    try {
      const res = await fetch("/api/apple-music/link-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseSlug: selectedReleaseSlug, appleAlbumId: item.id, appleUrl: item.attributes.url }),
      });
      if (!res.ok) throw new Error("Link failed");
      setLinkStatus((prev) => ({ ...prev, [item.id]: "ok" }));
    } catch {
      setLinkStatus((prev) => ({ ...prev, [item.id]: "err" }));
    } finally {
      setLinking(null);
    }
  }

  async function linkSong(item: AMSearchSong) {
    if (!selectedSongSlug) { setError("Select a SUMG song first"); return; }
    setLinking(item.id);
    try {
      const res = await fetch("/api/apple-music/link-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songSlug: selectedSongSlug, appleSongId: item.id, appleUrl: item.attributes.url }),
      });
      if (!res.ok) throw new Error("Link failed");
      setLinkStatus((prev) => ({ ...prev, [item.id]: "ok" }));
    } catch {
      setLinkStatus((prev) => ({ ...prev, [item.id]: "err" }));
    } finally {
      setLinking(null);
    }
  }

  const hasResults = amArtists.length > 0 || amAlbums.length > 0 || amSongs.length > 0;

  return (
    <div className="space-y-6">
      {/* Search controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SearchType)}
          className="border border-white/15 bg-white/5 px-3 py-2.5 text-xs text-white/60 focus:outline-none focus:border-white/30 transition"
        >
          <option value="artists">Artists</option>
          <option value="albums">Albums</option>
          <option value="songs">Songs</option>
        </select>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search Apple Music…"
          className="flex-1 border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={status === "loading" || !query.trim()}
          className="border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
        >
          {status === "loading" ? "…" : "Search"}
        </button>
      </div>

      {/* Link-target selectors */}
      {type === "artists" && artists.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 flex-none">Link to</span>
          <select
            value={selectedArtistSlug}
            onChange={(e) => setSelectedArtistSlug(e.target.value)}
            className="border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/60 focus:outline-none focus:border-white/30 transition"
          >
            <option value="">Select SUMG artist…</option>
            {artists.map((a) => (
              <option key={a.slug} value={a.slug}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {type === "albums" && releases.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 flex-none">Link to</span>
          <select
            value={selectedReleaseSlug}
            onChange={(e) => setSelectedReleaseSlug(e.target.value)}
            className="border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/60 focus:outline-none focus:border-white/30 transition"
          >
            <option value="">Select SUMG release…</option>
            {releases.map((r) => (
              <option key={r.slug} value={r.slug}>{r.title} — {r.artistName}</option>
            ))}
          </select>
        </div>
      )}

      {type === "songs" && songs.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 flex-none">Link to</span>
          <select
            value={selectedSongSlug}
            onChange={(e) => setSelectedSongSlug(e.target.value)}
            className="border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/60 focus:outline-none focus:border-white/30 transition"
          >
            <option value="">Select SUMG song…</option>
            {songs.map((s) => (
              <option key={s.slug} value={s.slug}>{s.title} — {s.artistName}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-xs text-red-400/70">{error}</p>}

      {/* Artist results */}
      {amArtists.length > 0 && (
        <div className="space-y-2">
          {amArtists.map((artist) => {
            const thumb = artworkUrl(artist.attributes.artwork, 60);
            return (
              <div
                key={artist.id}
                className="flex items-center gap-3 border border-white/8 bg-white/[0.02] px-4 py-3"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={artist.attributes.name} width={40} height={40}
                    className="w-10 h-10 object-cover flex-none opacity-75" />
                ) : (
                  <div className="w-10 h-10 bg-white/10 flex-none flex items-center justify-center">
                    <span className="text-sm font-bold text-white/30">{artist.attributes.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{artist.attributes.name}</p>
                  <p className="text-[10px] text-white/30 truncate">{artist.attributes.genreNames[0] ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <a
                    href={artist.attributes.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] border border-white/10 text-white/30 px-3 py-1.5 hover:border-white/25 hover:text-white/60 transition-colors"
                  >
                    Open ↗
                  </a>
                  {artists.length > 0 && (
                    <LinkBtn
                      id={artist.id}
                      linking={linking}
                      linkStatus={linkStatus}
                      onClick={() => linkArtist(artist)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Album results */}
      {amAlbums.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {amAlbums.map((album) => {
            const thumb = artworkUrl(album.attributes.artwork, 400);
            const ls = linkStatus[album.id];
            return (
              <div
                key={album.id}
                className="border border-white/8 hover:border-white/12 transition-colors overflow-hidden flex flex-col"
              >
                <a
                  href={album.attributes.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={album.attributes.name} width={200} height={200}
                      className="w-full aspect-square object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="w-full aspect-square bg-white/[0.03] flex items-center justify-center">
                      <span className="text-3xl font-black text-white/10">{album.attributes.name.charAt(0)}</span>
                    </div>
                  )}
                </a>
                <div className="p-2.5 flex flex-col gap-2 flex-1">
                  <div>
                    <p className="text-xs font-medium text-white/60 truncate">{album.attributes.name}</p>
                    <p className="text-[10px] text-white/25 mt-0.5 truncate">
                      {album.attributes.artistName} · {album.attributes.releaseDate?.slice(0, 4)}
                    </p>
                  </div>
                  {releases.length > 0 && (
                    <button
                      type="button"
                      disabled={linking === album.id || ls === "ok"}
                      onClick={() => linkAlbum(album)}
                      className={`w-full text-[9px] uppercase tracking-[0.1em] border py-1.5 transition-colors ${
                        ls === "ok"
                          ? "border-green-500/30 text-green-400/60"
                          : ls === "err"
                          ? "border-red-500/30 text-red-400/60"
                          : "border-white/10 text-white/25 hover:border-white/25 hover:text-white disabled:opacity-40"
                      }`}
                    >
                      {ls === "ok" ? "Linked ✓" : ls === "err" ? "Failed" : linking === album.id ? "…" : "Link Release"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Song results */}
      {amSongs.length > 0 && (
        <div className="divide-y divide-white/[0.04]">
          {amSongs.map((song) => {
            const thumb = artworkUrl(song.attributes.artwork, 36);
            return (
              <div
                key={song.id}
                className="flex items-center gap-3 py-3 hover:bg-white/[0.02] px-2 transition-colors"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt={song.attributes.albumName} width={36} height={36}
                    className="w-9 h-9 object-cover opacity-60 flex-none" />
                ) : (
                  <div className="w-9 h-9 bg-white/10 flex-none" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white/60 truncate block">
                    {song.attributes.name}
                    {song.attributes.contentRating === "explicit" && (
                      <span className="ml-2 text-[9px] border border-white/15 text-white/20 px-1.5 py-0.5">E</span>
                    )}
                  </span>
                  <span className="text-[10px] text-white/25 truncate block">
                    {song.attributes.artistName} · {song.attributes.albumName}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="text-[11px] font-mono text-white/25">
                    {msToTime(song.attributes.durationInMillis)}
                  </span>
                  <a
                    href={song.attributes.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] border border-white/10 text-white/25 px-2 py-1 hover:border-white/25 hover:text-white/50 transition-colors"
                  >
                    ↗
                  </a>
                  {songs.length > 0 && (
                    <LinkBtn
                      id={song.id}
                      linking={linking}
                      linkStatus={linkStatus}
                      onClick={() => linkSong(song)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status === "done" && !hasResults && (
        <p className="text-xs text-white/30 text-center py-4">No results found.</p>
      )}
    </div>
  );
}
