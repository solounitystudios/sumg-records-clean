"use client";

import { useMemo } from "react";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

/**
 * /access/artist/analytics — Streaming and DSP snapshot data.
 * Shows Spotify follower/popularity data from artist_spotify_snapshots.
 * Advanced analytics (period comparison, DSP breakdown) are Phase 4.
 */
export default function ArtistAnalyticsPage() {
  const user = useAccessUser();
  const { artists, releases, songs } = useCmsStore();

  const artistSlug = user.artistSlug ?? "";
  const artist = useMemo(() => artists.find((a) => a.slug === artistSlug), [artists, artistSlug]);

  const mySongs = useMemo(
    () => songs.filter((s) => s.artistSlug === artistSlug && s.status === "published"),
    [songs, artistSlug]
  );

  const myReleases = useMemo(
    () => releases.filter((r) => r.artistSlug === artistSlug),
    [releases, artistSlug]
  );

  const publishedReleases = myReleases.filter((r) => r.status === "published");

  // Collect songs that have Spotify audio features
  const songsWithFeatures = mySongs.filter((s) => s.spotifyAudioFeatures);

  const avgTempo = songsWithFeatures.length
    ? songsWithFeatures.reduce((acc, s) => acc + (s.spotifyAudioFeatures?.tempo ?? 0), 0) /
      songsWithFeatures.length
    : null;

  const avgEnergy = songsWithFeatures.length
    ? songsWithFeatures.reduce((acc, s) => acc + (s.spotifyAudioFeatures?.energy ?? 0), 0) /
      songsWithFeatures.length
    : null;

  return (
    <AccessShell
      title="Analytics"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist", href: "/access/artist" },
        { label: "Analytics" },
      ]}
    >
      <div className="space-y-10">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Analytics</h2>
          <p className="text-[11px] text-white/30 mt-1">
            Streaming data and audio feature insights for {artist?.name ?? artistSlug}.
          </p>
        </div>

        {/* Catalog stats */}
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">Catalog Overview</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5">
            {[
              { label: "Published Releases", value: publishedReleases.length },
              { label: "Live Songs", value: mySongs.length },
              { label: "With ISRC", value: mySongs.filter((s) => s.isrc).length },
              { label: "Spotify Linked", value: mySongs.filter((s) => s.spotifyTrackId).length },
            ].map((s) => (
              <div key={s.label} className="bg-black px-4 py-4">
                <p className="text-2xl font-black text-white/70">{s.value}</p>
                <p className="text-[9px] tracking-[0.15em] uppercase text-white/25 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Spotify snapshot */}
        {artist?.spotifyId ? (
          <div>
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">Spotify</p>
            <div className="border border-white/5 p-5">
              <p className="text-[10px] text-white/30 mb-3">
                Spotify Artist ID:{" "}
                <span className="font-mono text-white/50">{artist.spotifyId}</span>
              </p>
              <a
                href={artist.socialLinks?.spotify ?? `https://open.spotify.com/artist/${artist.spotifyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/25 hover:text-white/70 transition-all"
              >
                Open on Spotify →
              </a>
              <div className="mt-4 border border-white/[0.06] bg-white/[0.01] px-4 py-3">
                <p className="text-[9px] tracking-[0.15em] uppercase text-white/20 mb-1">Snapshot Data</p>
                <p className="text-[11px] text-white/35">
                  Follower and popularity snapshots are fetched periodically by your label team.
                  Advanced analytics graphs are coming in Phase 4.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-white/5 py-8 text-center">
            <p className="text-[11px] text-white/20">Spotify not linked yet.</p>
            <p className="text-[10px] text-white/15 mt-1">
              Ask your label manager to link your Spotify profile.
            </p>
          </div>
        )}

        {/* Audio features */}
        {songsWithFeatures.length > 0 && (
          <div>
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">
              Catalog Audio Profile — {songsWithFeatures.length} song{songsWithFeatures.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-px bg-white/5">
              {[
                { label: "Avg Tempo", value: avgTempo !== null ? `${Math.round(avgTempo)} BPM` : "—" },
                { label: "Avg Energy", value: avgEnergy !== null ? `${Math.round(avgEnergy * 100)}%` : "—" },
              ].map((f) => (
                <div key={f.label} className="bg-black px-5 py-4">
                  <p className="text-2xl font-black text-white/60">{f.value}</p>
                  <p className="text-[9px] tracking-[0.15em] uppercase text-white/25 mt-1">{f.label}</p>
                </div>
              ))}
            </div>

            {/* Per-song feature bars */}
            <div className="mt-4 border border-white/5 divide-y divide-white/[0.04]">
              <div className="grid grid-cols-6 gap-2 px-4 py-2 text-[8px] tracking-[0.15em] uppercase text-white/20 bg-white/[0.01]">
                <span className="col-span-2">Song</span>
                <span>Tempo</span>
                <span>Energy</span>
                <span>Dance</span>
                <span>Valence</span>
              </div>
              {songsWithFeatures.slice(0, 10).map((s) => (
                <div key={s.id} className="grid grid-cols-6 gap-2 px-4 py-2 items-center">
                  <p className="col-span-2 text-[10px] text-white/50 truncate">{s.title}</p>
                  <p className="text-[9px] font-mono text-white/35">
                    {Math.round(s.spotifyAudioFeatures!.tempo)}
                  </p>
                  <p className="text-[9px] font-mono text-white/35">
                    {Math.round(s.spotifyAudioFeatures!.energy * 100)}%
                  </p>
                  <p className="text-[9px] font-mono text-white/35">
                    {Math.round(s.spotifyAudioFeatures!.danceability * 100)}%
                  </p>
                  <p className="text-[9px] font-mono text-white/35">
                    {Math.round(s.spotifyAudioFeatures!.valence * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 4 notice */}
        <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 mb-1.5">Advanced Analytics</p>
          <p className="text-[11px] text-white/35 leading-relaxed">
            Period-over-period comparison, DSP stream breakdowns, and Spotify follower growth
            charts are part of the Phase 4 intelligence layer.
          </p>
        </div>
      </div>
    </AccessShell>
  );
}
