"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

export default function ArtistReleaseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const user = useAccessUser();
  const { releases, songs } = useCmsStore();

  const release = useMemo(
    () => releases.find((r) => r.slug === slug && r.artistSlug === (user.artistSlug ?? "")),
    [releases, slug, user.artistSlug]
  );

  const tracklistSongs = useMemo(
    () =>
      songs
        .filter((s) => s.releaseSlug === slug)
        .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0)),
    [songs, slug]
  );

  if (!release) {
    return (
      <AccessShell
        title="Release"
        breadcrumbs={[
          { label: "Access", href: "/access" },
          { label: "Releases", href: "/access/artist/releases" },
          { label: "Not Found" },
        ]}
      >
        <div className="py-20 text-center">
          <p className="text-[12px] text-white/20">Release not found.</p>
          <Link href="/access/artist/releases" className="mt-4 inline-block text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
            ← Back to Releases
          </Link>
        </div>
      </AccessShell>
    );
  }

  return (
    <AccessShell
      title={release.title}
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Releases", href: "/access/artist/releases" },
        { label: release.title },
      ]}
    >
      <div className="max-w-3xl space-y-10">
        {/* Hero */}
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-white/5 flex-shrink-0 overflow-hidden">
            {release.coverArtUrl ? (
              <img src={release.coverArtUrl} alt={release.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white/15 text-2xl">◑</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-1">{release.type}</p>
            <h2 className="text-2xl font-black tracking-tight text-white">{release.title}</h2>
            <p className="text-[11px] text-white/35 mt-1">{release.releaseDate.slice(0, 10)}</p>
            <span
              className={`inline-block mt-2 text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${
                release.status === "published"
                  ? "border-green-800/40 text-green-400/60"
                  : release.status === "draft"
                  ? "border-yellow-800/40 text-yellow-400/60"
                  : "border-white/10 text-white/25"
              }`}
            >
              {release.status}
            </span>
          </div>
        </div>

        {/* DSP Links */}
        {release.dspLinks && Object.values(release.dspLinks).some(Boolean) && (
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-3">Listen On</p>
            <div className="flex flex-wrap gap-2">
              {(["spotify", "appleMusic", "youtubeMusic", "soundcloud", "tidal", "deezer"] as const).map((dsp) => {
                const url = release.dspLinks?.[dsp];
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

        {/* Tracklist */}
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-3">
            Tracklist · {tracklistSongs.length} track
            {tracklistSongs.length !== 1 ? "s" : ""}
          </p>
          {tracklistSongs.length === 0 ? (
            <div className="border border-white/5 py-8 text-center">
              <p className="text-[11px] text-white/20">No tracks linked yet.</p>
            </div>
          ) : (
            <div className="border border-white/5 divide-y divide-white/[0.04]">
              {tracklistSongs.map((s) => (
                <Link
                  key={s.id}
                  href={`/access/artist/songs/${s.slug}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-[10px] text-white/20 font-mono w-5 text-right flex-shrink-0">
                    {s.trackNumber ?? "—"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/65 truncate">{s.title}</p>
                    {s.duration && (
                      <p className="text-[10px] text-white/25 mt-0.5">{s.duration}</p>
                    )}
                  </div>
                  {s.isrc && (
                    <span className="hidden sm:block text-[9px] font-mono text-white/20">
                      {s.isrc}
                    </span>
                  )}
                  <span className="text-white/20 text-xs flex-shrink-0">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Distribution */}
        {release.distributionRecord && (
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-3">Distribution</p>
            <div className="border border-white/5 divide-y divide-white/[0.04]">
              {[
                { label: "Distributor", value: release.distributionRecord.distributor },
                { label: "UPC", value: release.distributionRecord.upc },
                { label: "Submission", value: release.distributionRecord.submissionStatus },
                { label: "Delivery", value: release.distributionRecord.deliveryStatus },
                { label: "Live Status", value: release.distributionRecord.liveStatus },
              ]
                .filter((row) => row.value)
                .map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/30">
                      {row.label}
                    </p>
                    <p className="text-[10px] text-white/50 font-mono">{row.value}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Rights */}
        {release.rightsMetadata && (
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-3">Rights</p>
            <div className="border border-white/5 divide-y divide-white/[0.04]">
              {[
                { label: "PRO", value: release.rightsMetadata.pro },
                { label: "Publisher", value: release.rightsMetadata.publisher },
                { label: "Status", value: release.rightsMetadata.compositionStatus },
              ]
                .filter((row) => row.value)
                .map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-white/30">
                      {row.label}
                    </p>
                    <p className="text-[10px] text-white/50">{row.value}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </AccessShell>
  );
}
