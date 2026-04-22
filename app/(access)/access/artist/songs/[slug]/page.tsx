"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

export default function ArtistSongDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const user = useAccessUser();
  const { songs } = useCmsStore();

  const song = useMemo(
    () => songs.find((s) => s.slug === slug && s.artistSlug === (user.artistSlug ?? "")),
    [songs, slug, user.artistSlug]
  );

  if (!song) {
    return (
      <AccessShell
        title="Song"
        breadcrumbs={[
          { label: "Access", href: "/access" },
          { label: "Songs", href: "/access/artist/songs" },
          { label: "Not Found" },
        ]}
      >
        <div className="py-20 text-center">
          <p className="text-[12px] text-white/20">Song not found.</p>
          <Link href="/access/artist/songs" className="mt-4 inline-block text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
            ← Back to Songs
          </Link>
        </div>
      </AccessShell>
    );
  }

  return (
    <AccessShell
      title={song.title}
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Songs", href: "/access/artist/songs" },
        { label: song.title },
      ]}
    >
      <div className="max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-1">
            {song.genre ?? "Song"}
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white">{song.title}</h2>
          {song.releaseName && (
            <p className="text-[11px] text-white/35 mt-1">
              From{" "}
              <Link href={`/access/artist/releases/${song.releaseSlug}`} className="text-white/50 hover:text-white transition-colors">
                {song.releaseName}
              </Link>
              {song.trackNumber !== undefined && ` · Track ${song.trackNumber}`}
            </p>
          )}
          <span
            className={`inline-block mt-2 text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${
              song.status === "published"
                ? "border-green-800/40 text-green-400/60"
                : song.status === "draft"
                ? "border-yellow-800/40 text-yellow-400/60"
                : "border-white/10 text-white/25"
            }`}
          >
            {song.status}
          </span>
        </div>

        {/* Core metadata */}
        <div className="border border-white/5 divide-y divide-white/[0.04]">
          {[
            { label: "ISRC", value: song.isrc, mono: true, warn: !song.isrc },
            { label: "Duration", value: song.duration, mono: true },
            { label: "Explicit", value: song.isExplicit ? "Yes" : "No" },
            { label: "Genre", value: song.genre },
          ]
            .filter((r) => r.value !== undefined && r.value !== null)
            .map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-[10px] tracking-[0.15em] uppercase text-white/30">{row.label}</p>
                <p
                  className={`text-[11px] ${row.mono ? "font-mono" : ""} ${
                    row.warn ? "text-yellow-400/60" : "text-white/55"
                  }`}
                >
                  {row.value ?? "—"}
                </p>
              </div>
            ))}
        </div>

        {/* DSP Links */}
        {song.dspLinks && Object.values(song.dspLinks).some(Boolean) && (
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-3">Listen On</p>
            <div className="flex flex-wrap gap-2">
              {(["spotify", "appleMusic", "youtubeMusic", "soundcloud"] as const).map((dsp) => {
                const url = song.dspLinks?.[dsp];
                if (!url) return null;
                const labels: Record<string, string> = {
                  appleMusic: "Apple Music",
                  youtubeMusic: "YouTube Music",
                };
                return (
                  <a
                    key={dsp}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase text-white/40 hover:border-white/25 hover:text-white/70 transition-all capitalize"
                  >
                    {labels[dsp] ?? dsp}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Rights */}
        {song.rightsMetadata && (
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-3">Rights</p>
            <div className="border border-white/5 divide-y divide-white/[0.04]">
              {[
                { label: "PRO", value: song.rightsMetadata.pro },
                { label: "IPI / CAE", value: song.rightsMetadata.ipiCae },
                { label: "Publisher", value: song.rightsMetadata.publisher },
                { label: "Composition Status", value: song.rightsMetadata.compositionStatus },
                { label: "Last Verified", value: song.rightsMetadata.lastVerified?.slice(0, 10) },
              ]
                .filter((row) => row.value)
                .map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/30">{row.label}</p>
                    <p className="text-[11px] text-white/50">{row.value}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Spotify audio features */}
        {song.spotifyAudioFeatures && (
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-3">Audio Features</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/5">
              {[
                { label: "Tempo", value: `${Math.round(song.spotifyAudioFeatures.tempo)} BPM` },
                { label: "Energy", value: `${Math.round(song.spotifyAudioFeatures.energy * 100)}%` },
                { label: "Danceability", value: `${Math.round(song.spotifyAudioFeatures.danceability * 100)}%` },
                { label: "Valence", value: `${Math.round(song.spotifyAudioFeatures.valence * 100)}%` },
                { label: "Acousticness", value: `${Math.round(song.spotifyAudioFeatures.acousticness * 100)}%` },
                { label: "Loudness", value: `${song.spotifyAudioFeatures.loudness.toFixed(1)} dB` },
              ].map((f) => (
                <div key={f.label} className="bg-black px-4 py-3">
                  <p className="text-sm font-semibold text-white/60">{f.value}</p>
                  <p className="text-[9px] tracking-[0.15em] uppercase text-white/25 mt-0.5">{f.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lyrics */}
        {song.lyrics && (
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-3">Lyrics</p>
            <pre className="text-sm text-white/40 leading-relaxed whitespace-pre-wrap font-sans border border-white/5 p-5 max-h-64 overflow-y-auto">
              {song.lyrics}
            </pre>
          </div>
        )}
      </div>
    </AccessShell>
  );
}
