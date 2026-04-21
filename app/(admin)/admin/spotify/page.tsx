"use client";

import { useState, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface SpotifyArtistResult {
  id: string;
  name: string;
  genres: string[];
  followers: { total: number };
  images: SpotifyImage[];
  popularity: number;
  external_urls: { spotify: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

async function searchArtists(q: string): Promise<SpotifyArtistResult[]> {
  const res = await fetch(
    `/api/spotify/search?q=${encodeURIComponent(q)}&types=artist&limit=10`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Search failed: ${res.status}`
    );
  }
  const data = await res.json() as { artists?: { items: SpotifyArtistResult[] } };
  return data.artists?.items ?? [];
}

// ─── Result card ─────────────────────────────────────────────────────────────

interface ResultCardProps {
  artist: SpotifyArtistResult;
}

function ResultCard({ artist }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(artist.external_urls.spotify).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [artist.external_urls.spotify]);

  const image = artist.images.find((img) => img.height && img.height <= 300) ?? artist.images[0];

  return (
    <div className="flex items-start gap-4 border border-white/[0.06] p-4 hover:border-white/10 transition-colors">
      {/* Avatar */}
      <div className="flex-none w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-white/[0.03]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={artist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-lg font-black">
            {artist.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/80 truncate">{artist.name}</p>

        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[10px] text-white/30">
            {formatFollowers(artist.followers.total)} followers
          </span>
          <span className="text-[10px] text-white/20">
            Popularity {artist.popularity}/100
          </span>
        </div>

        {artist.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {artist.genres.slice(0, 4).map((genre) => (
              <span
                key={genre}
                className="text-[10px] tracking-[0.1em] uppercase text-white/20 border border-white/[0.08] px-2 py-0.5"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Spotify URL — monospace, selectable */}
        <div className="mt-3 flex items-center gap-2">
          <code className="text-[10px] font-mono text-white/30 truncate flex-1 bg-white/[0.03] px-2 py-1 border border-white/[0.06]">
            {artist.external_urls.spotify}
          </code>

          <button
            onClick={handleCopy}
            className="flex-none text-[9px] tracking-[0.15em] uppercase border border-white/10 text-white/30 px-3 py-1.5 hover:border-white/25 hover:text-white/70 transition-colors whitespace-nowrap"
          >
            {copied ? "Copied ✓" : "Copy URL"}
          </button>

          <a
            href={artist.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-none text-[9px] tracking-[0.15em] uppercase border border-white/10 text-white/30 px-3 py-1.5 hover:border-white/25 hover:text-white/70 transition-colors"
          >
            Open ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpotifySearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyArtistResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const artists = await searchArtists(q);
      setResults(artists);
      if (artists.length === 0) {
        setError("No artists found for that query.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Spotify Artist Search">
      <div className="max-w-2xl space-y-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-1">
            Spotify Search
          </p>
          <p className="text-xs text-white/30">
            Find an artist on Spotify, then copy their URL into the{" "}
            <a
              href="/admin/artists"
              className="underline underline-offset-2 hover:text-white/60 transition-colors"
            >
              Artist editor
            </a>{" "}
            → Social Links → Spotify field.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artist name…"
            className="flex-1 bg-white/[0.03] border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase border border-white/15 text-white/50 hover:border-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400/70 border border-red-500/20 px-4 py-3">
            {error}
          </p>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 mb-3">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((artist) => (
              <ResultCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}

        {/* Usage note */}
        <div className="border border-white/[0.04] px-4 py-4 text-[10px] text-white/20 leading-relaxed space-y-1">
          <p className="text-white/30 font-semibold mb-2">How to use</p>
          <p>1. Search by artist name above.</p>
          <p>2. Verify the correct artist using followers, genres, and the Open ↗ link.</p>
          <p>3. Click <strong className="text-white/30">Copy URL</strong> to copy the Spotify profile URL.</p>
          <p>
            4. Open{" "}
            <a
              href="/admin/artists"
              className="underline underline-offset-2 hover:text-white/40 transition-colors"
            >
              /admin/artists
            </a>
            , edit the artist, and paste the URL into{" "}
            <em>Social Links → Spotify</em>.
          </p>
          <p>5. Save — the artist page will show Spotify data on next load.</p>
        </div>
      </div>
    </AdminShell>
  );
}
