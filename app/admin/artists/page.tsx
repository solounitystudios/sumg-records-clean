import Link from "next/link"
import { Suspense } from "react"
import { getArtists } from "@/lib/db/artists"
import { getReleases } from "@/lib/db/releases"
import { getAllSongs } from "@/lib/db/songs"
import { archiveArtist, restoreArtist, deleteArtist } from "@/app/actions/artists"
import ArtistPhotoUpload from "./ArtistPhotoUpload"
import ArtistActionMenu from "./ArtistActionMenu"
import { SpotifyStatsWidget } from "@/components/admin/SpotifyStatsWidget"

export const dynamic = "force-dynamic"
export const metadata = { title: "Artist Management — SUMG Admin" }

const STATUS_CLS: Record<string, string> = {
  active:   "bg-emerald-500/12 text-emerald-400 border-emerald-500/20",
  draft:    "bg-white/5 text-white/35 border-white/10",
  archived: "bg-red-500/8 text-red-400/60 border-red-500/15",
}

export default async function ArtistsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const [{ status: filterStatus }, allArtists, allReleases, allSongs] = await Promise.all([
    searchParams,
    getArtists(),
    getReleases(),
    getAllSongs(),
  ])

  const activeCount   = allArtists.filter((a) => !a.status || a.status === "active").length
  const archivedCount = allArtists.filter((a) => a.status === "archived").length
  const draftCount    = allArtists.filter((a) => a.status === "draft").length

  const artists = filterStatus
    ? filterStatus === "active"
      ? allArtists.filter((a) => !a.status || a.status === "active")
      : allArtists.filter((a) => a.status === filterStatus)
    : allArtists

  return (
    <main className="px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / Catalog</p>
          <h1 className="text-3xl font-semibold tracking-tight">Artist Management</h1>
          <p className="mt-2 text-sm text-white/40">
            {filterStatus ? (
              <>Showing <span className="text-white/60">{filterStatus}</span> artists · <Link href="/admin/artists" className="text-white/35 hover:text-white/60 transition-colors duration-150 underline underline-offset-2">Clear filter</Link></>
            ) : "Roster overview and full media management."}
          </p>
        </div>
        <Link
          href="/admin/artists/new"
          className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-medium text-black hover:bg-white/90 transition-all duration-150"
        >
          + New Artist
        </Link>
      </div>

      {/* Clickable KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        {[
          { label: "Total Artists", value: allArtists.length, href: "/admin/artists", accent: "border-l-white/20", active: !filterStatus },
          { label: "Active",        value: activeCount,       href: "/admin/artists?status=active",   accent: "border-l-emerald-500/50", active: filterStatus === "active" },
          { label: "Draft",         value: draftCount,        href: "/admin/artists?status=draft",    accent: "border-l-white/20", active: filterStatus === "draft" },
          { label: "Archived",      value: archivedCount,     href: "/admin/artists?status=archived", accent: "border-l-red-500/30", active: filterStatus === "archived" },
        ].map(({ label, value, href, accent, active }) => (
          <Link
            key={label}
            href={href}
            className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-150 ${
              active
                ? "border-white/20 bg-white/[0.06]"
                : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
            }`}
          >
            <div className={`absolute inset-y-0 left-0 w-[2px] rounded-l-2xl ${accent}`} />
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/30 mb-2 font-mono">{label}</div>
            <div className="text-2xl font-semibold tabular-nums font-mono">{value}</div>
            {active && <div className="absolute top-3 right-3 h-1 w-1 rounded-full bg-white/40" />}
          </Link>
        ))}
      </div>

      {/* Artist cards */}
      <div className="space-y-3">
        {artists.map((artist) => {
          const artistReleases = allReleases.filter((r) => r.artistSlug === artist.slug)
          const liveReleases   = artistReleases.filter((r) => r.status === "published")
          const artistSongs    = allSongs.filter((s) => s.artistSlug === artist.slug)
          const isArchived     = artist.status === "archived"

          const archiveAction = archiveArtist.bind(null, artist.slug)
          const restoreAction = restoreArtist.bind(null, artist.slug)
          const deleteAction  = deleteArtist.bind(null, artist.slug)

          const hasHeroImage    = !!artist.heroImageUrl
          const hasProfileImage = !!artist.profileImageUrl
          const hasSpotify      = !!artist.spotifyId
          const hasAppleMusic   = !!artist.appleMusicId
          const hasSocials      = !!(artist.socialLinks && Object.values(artist.socialLinks).some(Boolean))

          return (
            <div
              key={artist.slug}
              className={`rounded-2xl border overflow-hidden transition-all duration-150 ${
                isArchived
                  ? "border-white/[0.04] bg-[#0a0c10]/50 opacity-55"
                  : "border-white/[0.08] bg-[#0a0c10] hover:border-white/[0.13]"
              }`}
            >
              <div className="flex items-start gap-5 p-5">
                <ArtistPhotoUpload
                  artistSlug={artist.slug}
                  artistInitial={artist.name.charAt(0)}
                  currentImageUrl={artist.profileImageUrl}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold">{artist.name}</h3>
                      <span className={`text-[9px] border px-2 py-0.5 rounded-full font-mono tracking-wider ${STATUS_CLS[artist.status ?? "active"] ?? STATUS_CLS.active}`}>
                        {artist.status ?? "active"}
                      </span>
                      {artist.featured && (
                        <span className="text-[9px] border border-amber-500/20 px-2 py-0.5 rounded-full font-mono text-amber-400/60 bg-amber-500/[0.06]">
                          featured
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ArtistActionMenu
                        slug={artist.slug}
                        isArchived={isArchived}
                        archiveAction={archiveAction}
                        restoreAction={restoreAction}
                        deleteAction={deleteAction}
                      />
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-white/40 font-mono">{artist.role} · {artist.genre}</p>
                  <p className="mt-2.5 text-sm text-white/50 leading-relaxed max-w-2xl line-clamp-2">{artist.bio}</p>

                  {/* Release + song stats — clickable */}
                  <div className="mt-4 flex items-center gap-2.5 flex-wrap">
                    <Link
                      href={`/admin/releases?artist=${artist.slug}&status=published`}
                      className="flex-1 min-w-[100px] max-w-[160px] rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-150"
                    >
                      <div className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-mono mb-0.5">Live Releases</div>
                      <div className="text-sm font-semibold font-mono tabular-nums text-emerald-400">{liveReleases.length}</div>
                    </Link>
                    <Link
                      href={`/admin/releases?artist=${artist.slug}`}
                      className="flex-1 min-w-[100px] max-w-[160px] rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-150"
                    >
                      <div className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-mono mb-0.5">All Releases</div>
                      <div className="text-sm font-semibold font-mono tabular-nums">{artistReleases.length}</div>
                    </Link>
                    <Link
                      href={`/admin/songs?artist=${artist.slug}`}
                      className="flex-1 min-w-[100px] max-w-[160px] rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-150"
                    >
                      <div className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-mono mb-0.5">Songs</div>
                      <div className="text-sm font-semibold font-mono tabular-nums">{artistSongs.length}</div>
                    </Link>
                  </div>

                  {/* Media management strip */}
                  <div className="mt-3.5 flex items-center flex-wrap gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/20 mr-1">Media</span>
                    <Link
                      href={`/admin/artists/${artist.slug}/edit#hero`}
                      className={`flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1 rounded border transition-all duration-150 ${
                        hasHeroImage
                          ? "border-emerald-500/20 text-emerald-400/60 bg-emerald-500/[0.04] hover:border-emerald-500/40 hover:text-emerald-400/80"
                          : "border-white/[0.07] text-white/25 hover:border-white/20 hover:text-white/50"
                      }`}
                    >
                      <span className={`h-1 w-1 rounded-full ${hasHeroImage ? "bg-emerald-400/60" : "bg-white/15"}`} />
                      Hero
                    </Link>
                    <Link
                      href={`/admin/artists/${artist.slug}/edit#profile`}
                      className={`flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1 rounded border transition-all duration-150 ${
                        hasProfileImage
                          ? "border-emerald-500/20 text-emerald-400/60 bg-emerald-500/[0.04] hover:border-emerald-500/40 hover:text-emerald-400/80"
                          : "border-white/[0.07] text-white/25 hover:border-white/20 hover:text-white/50"
                      }`}
                    >
                      <span className={`h-1 w-1 rounded-full ${hasProfileImage ? "bg-emerald-400/60" : "bg-white/15"}`} />
                      Photo
                    </Link>
                    <Link
                      href={`/admin/spotify`}
                      className={`flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1 rounded border transition-all duration-150 ${
                        hasSpotify
                          ? "border-[#1DB954]/20 text-[#1DB954]/50 bg-[#1DB954]/[0.04] hover:border-[#1DB954]/40"
                          : "border-white/[0.07] text-white/25 hover:border-white/20 hover:text-white/50"
                      }`}
                    >
                      <span className={`h-1 w-1 rounded-full ${hasSpotify ? "bg-[#1DB954]/60" : "bg-white/15"}`} />
                      Spotify
                    </Link>
                    <Link
                      href={`/admin/apple-music`}
                      className={`flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1 rounded border transition-all duration-150 ${
                        hasAppleMusic
                          ? "border-rose-500/20 text-rose-400/60 bg-rose-500/[0.04] hover:border-rose-500/40"
                          : "border-white/[0.07] text-white/25 hover:border-white/20 hover:text-white/50"
                      }`}
                    >
                      <span className={`h-1 w-1 rounded-full ${hasAppleMusic ? "bg-rose-400/60" : "bg-white/15"}`} />
                      Apple Music
                    </Link>
                    <Link
                      href={`/admin/artists/${artist.slug}/edit#socials`}
                      className={`flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1 rounded border transition-all duration-150 ${
                        hasSocials
                          ? "border-blue-500/20 text-blue-400/60 bg-blue-500/[0.04] hover:border-blue-500/40"
                          : "border-white/[0.07] text-white/25 hover:border-white/20 hover:text-white/50"
                      }`}
                    >
                      <span className={`h-1 w-1 rounded-full ${hasSocials ? "bg-blue-400/60" : "bg-white/15"}`} />
                      Socials
                    </Link>
                    <Link
                      href={`/admin/assets?artist=${artist.slug}`}
                      className="flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1 rounded border border-white/[0.07] text-white/25 hover:border-white/20 hover:text-white/50 transition-all duration-150"
                    >
                      Asset Bin →
                    </Link>
                  </div>

                  {/* Tags */}
                  {artist.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {artist.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-2 py-0.5 rounded-full border border-white/[0.08] text-white/30 font-mono"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Spotify live stats */}
                  {artist.spotifyId && (
                    <Suspense fallback={null}>
                      <SpotifyStatsWidget spotifyId={artist.spotifyId} />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {artists.length === 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-10 text-center">
            <p className="text-sm text-white/25 font-mono">No {filterStatus ?? ""} artists.</p>
            {filterStatus && (
              <Link href="/admin/artists" className="mt-2 inline-block text-xs text-white/30 hover:text-white/60 transition-colors duration-150">
                Clear filter →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
