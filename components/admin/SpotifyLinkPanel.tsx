"use client";

import { useState, useTransition } from "react";
import { unlinkArtistSpotify } from "@/app/actions/artists";
import { formatFollowers } from "@/lib/spotifyFormat";

// ─── Minimal types for search results (no server-only import) ─────────────────

interface SpotifySearchArtist {
  id: string;
  name: string;
  followers: { total: number };
  images: Array<{ url: string; width: number | null; height: number | null }>;
  genres: string[];
  external_urls: { spotify: string };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpotifyLinkPanelProps {
  artistSlug: string;
  initialSpotifyUrl?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SpotifyLinkPanel({ artistSlug, initialSpotifyUrl }: SpotifyLinkPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifySearchArtist[]>([]);
  const [linkedUrl, setLinkedUrl] = useState<string | null | undefined>(initialSpotifyUrl);
  const [linkedArtist, setLinkedArtist] = useState<SpotifySearchArtist | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [linkStatus, setLinkStatus] = useState<"idle" | "linking" | "error">("idle");
  const [searchError, setSearchError] = useState("");
  const [linkError, setLinkError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearchStatus("loading");
    setSearchError("");
    setResults([]);
    try {
      const res = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(q)}&types=artist&limit=6`
      );
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const json = await res.json();
      setResults(json.artists?.items ?? []);
      setSearchStatus("done");
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setSearchStatus("error");
    }
  }

  async function handleLink(artist: SpotifySearchArtist) {
    setLinkStatus("linking");
    setLinkError("");
    try {
      const res = await fetch("/api/spotify/link-artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistSlug,
          spotifyUrl: artist.external_urls.spotify,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? `Link failed (${res.status})`);
      }
      setLinkedUrl(artist.external_urls.spotify);
      setLinkedArtist(artist);
      setResults([]);
      setQuery("");
      setSearchStatus("idle");
      setLinkStatus("idle");
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Link failed");
      setLinkStatus("error");
    }
  }

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkArtistSpotify(artistSlug);
      if (result.ok) {
        setLinkedUrl(null);
        setLinkedArtist(null);
        setLinkStatus("idle");
        setLinkError("");
      } else {
        setLinkError(result.error ?? "Unlink failed");
      }
    });
  }

  const isLinked = !!linkedUrl;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1DB954] flex-none" aria-hidden>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307a.75.75 0 01-1.031.25c-2.82-1.724-6.372-2.114-10.556-1.158a.75.75 0 01-.334-1.463c4.578-1.046 8.507-.596 11.672 1.34a.75.75 0 01.249 1.031zm1.471-3.27a.938.938 0 01-1.288.308c-3.226-1.983-8.143-2.558-11.963-1.4a.938.938 0 11-.547-1.795c4.356-1.326 9.774-.684 13.489 1.598a.938.938 0 01.309 1.289zm.126-3.404c-3.868-2.298-10.246-2.51-13.94-1.39a1.125 1.125 0 01-.655-2.153c4.24-1.29 11.29-1.04 15.747 1.608a1.125 1.125 0 01-1.152 1.935z" />
        </svg>
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Spotify</p>
        {isLinked && (
          <span className="ml-auto text-[10px] tracking-[0.15em] uppercase text-[#1DB954]/70 border border-[#1DB954]/20 px-2 py-0.5 rounded-full">
            Linked
          </span>
        )}
      </div>

      {/* Linked state */}
      {isLinked && (
        <div className="space-y-3">
          {linkedArtist ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
              {linkedArtist.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={linkedArtist.images[0].url}
                  alt={linkedArtist.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover flex-none opacity-80"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{linkedArtist.name}</p>
                <p className="text-xs text-white/35 truncate">
                  {formatFollowers(linkedArtist.followers.total)} followers
                  {linkedArtist.genres[0] && ` · ${linkedArtist.genres[0]}`}
                </p>
              </div>
              <a
                href={linkedArtist.external_urls.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#1DB954]/50 hover:text-[#1DB954] transition-colors flex-none"
              >
                ↗
              </a>
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <a
                href={linkedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1DB954]/60 hover:text-[#1DB954] transition-colors break-all"
              >
                {linkedUrl}
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={handleUnlink}
            disabled={isPending}
            className="text-xs text-white/25 hover:text-red-400/70 transition-colors disabled:opacity-40"
          >
            {isPending ? "Unlinking…" : "Unlink Spotify"}
          </button>

          {linkError && <p className="text-xs text-red-400/70">{linkError}</p>}

          <button
            type="button"
            onClick={() => { setLinkedUrl(null); setLinkedArtist(null); }}
            className="block text-xs text-white/20 hover:text-white/50 transition-colors"
          >
            Replace →
          </button>
        </div>
      )}

      {/* Search form (shown when not linked or replacing) */}
      {!isLinked && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search artist name on Spotify…"
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searchStatus === "loading" || !query.trim()}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
            >
              {searchStatus === "loading" ? "…" : "Search"}
            </button>
          </div>

          {searchError && <p className="text-xs text-red-400/70">{searchError}</p>}

          {/* Results */}
          {results.length > 0 && (
            <ul className="space-y-1">
              {results.map((artist) => (
                <li key={artist.id}>
                  <button
                    type="button"
                    onClick={() => handleLink(artist)}
                    disabled={linkStatus === "linking"}
                    className="w-full flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 px-3 py-2.5 text-left transition disabled:opacity-40"
                  >
                    {artist.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artist.images[0].url}
                        alt={artist.name}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover flex-none opacity-75"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/10 flex-none flex items-center justify-center">
                        <span className="text-sm font-bold text-white/30">{artist.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{artist.name}</p>
                      <p className="text-xs text-white/30">
                        {formatFollowers(artist.followers.total)} followers
                        {artist.genres[0] && ` · ${artist.genres[0]}`}
                      </p>
                    </div>
                    <span className="text-[10px] text-[#1DB954]/40 flex-none">
                      {linkStatus === "linking" ? "…" : "Link →"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searchStatus === "done" && results.length === 0 && (
            <p className="text-xs text-white/30 text-center py-2">No results found.</p>
          )}

          {linkError && <p className="text-xs text-red-400/70">{linkError}</p>}
        </div>
      )}
    </div>
  );
}
