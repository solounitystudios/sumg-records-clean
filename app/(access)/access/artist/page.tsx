"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

export default function ArtistHomePage() {
  const user = useAccessUser();
  const { artists, releases, songs } = useCmsStore();

  const artistSlug = user.artistSlug ?? "";
  const artist = useMemo(() => artists.find((a) => a.slug === artistSlug), [artists, artistSlug]);
  const myReleases = useMemo(() => releases.filter((r) => r.artistSlug === artistSlug), [releases, artistSlug]);
  const mySongs = useMemo(() => songs.filter((s) => s.artistSlug === artistSlug), [songs, artistSlug]);

  const recent = [...myReleases]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <AccessShell
      title="Artist"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist" },
      ]}
    >
      <div className="space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            {artist?.profileImageUrl && (
              <img
                src={artist.profileImageUrl}
                alt={artist.name}
                className="w-16 h-16 object-cover"
              />
            )}
            <div>
              <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-1">
                {artist?.tier === "primary" ? "Primary Artist" : "Artist"}
              </p>
              <h2 className="text-2xl font-black tracking-tight text-white">
                {artist?.name ?? artistSlug}
              </h2>
              {artist?.genre && (
                <p className="text-[11px] text-white/35 mt-0.5">{artist.genre}</p>
              )}
            </div>
          </div>
          <Link
            href="/access/artist/profile"
            className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/25 hover:text-white/70 transition-all"
          >
            Edit Profile
          </Link>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5">
          {[
            { label: "Releases", value: myReleases.length, href: "/access/artist/releases" },
            { label: "Songs", value: mySongs.length, href: "/access/artist/songs" },
            { label: "Published", value: myReleases.filter((r) => r.status === "published").length, href: "/access/artist/releases" },
            { label: "Drafts", value: myReleases.filter((r) => r.status === "draft").length, href: "/access/artist/releases" },
          ].map((s) => (
            <Link key={s.href + s.label} href={s.href} className="bg-black p-5 hover:bg-white/[0.03] transition-colors block">
              <p className="text-3xl font-black text-white mb-1">{s.value}</p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">{s.label}</p>
            </Link>
          ))}
        </div>

        {/* Bio */}
        {artist?.bio && (
          <div>
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">Bio</p>
            <p className="text-sm text-white/45 leading-relaxed max-w-2xl">{artist.bio}</p>
          </div>
        )}

        {/* Recent releases */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/20">Recent Releases</p>
            <Link href="/access/artist/releases" className="text-[9px] tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors">
              View All →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="border border-white/5 py-10 text-center">
              <p className="text-[12px] text-white/20">No releases yet.</p>
            </div>
          ) : (
            <div className="border border-white/5 divide-y divide-white/[0.04]">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/access/artist/releases/${r.slug}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  {r.coverArtUrl && (
                    <img src={r.coverArtUrl} alt={r.title} className="w-10 h-10 object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/70 truncate">{r.title}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{r.type} · {r.releaseDate.slice(0, 10)}</p>
                  </div>
                  <span className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 flex-shrink-0 ${
                    r.status === "published" ? "border-green-800/40 text-green-400/60"
                    : r.status === "draft" ? "border-yellow-800/40 text-yellow-400/60"
                    : "border-white/10 text-white/25"
                  }`}>
                    {r.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AccessShell>
  );
}
