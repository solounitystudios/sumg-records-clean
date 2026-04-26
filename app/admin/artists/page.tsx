import Link from "next/link"
import { Suspense } from "react"
import { getArtists } from "@/lib/db/artists"
import { getReleases } from "@/lib/db/releases"
import { archiveArtist, restoreArtist } from "@/app/actions/artists"
import ArtistPhotoUpload from "./ArtistPhotoUpload"
import { SpotifyStatsWidget } from "@/components/admin/SpotifyStatsWidget"

export const metadata = { title: "Artist Management — SUMG Admin" }

const STATUS_CLS: Record<string, string> = {
  active:   "bg-emerald-500/15 text-emerald-400",
  draft:    "bg-white/8 text-white/35",
  archived: "bg-red-500/10 text-red-400/60",
}

export default async function ArtistsAdminPage() {
  const [artists, allReleases] = await Promise.all([getArtists(), getReleases()])

  const activeCount   = artists.filter((a) => !a.status || a.status === "active").length
  const archivedCount = artists.filter((a) => a.status === "archived").length
  const draftCount    = artists.filter((a) => a.status === "draft").length

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
          <h1 className="text-3xl font-semibold">Artist Management</h1>
          <p className="mt-2 text-sm text-white/50">Roster overview and artist profiles.</p>
        </div>
        <Link
          href="/admin/artists/new"
          className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-medium text-black hover:bg-white/90 transition"
        >
          + New Artist
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-4 mb-10">
        {[
          { label: "Total Artists",    value: artists.length.toString() },
          { label: "Active",           value: activeCount.toString() },
          { label: "Draft",            value: draftCount.toString() },
          { label: "Archived",         value: archivedCount.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {artists.map((artist) => {
          const artistReleases = allReleases.filter((r) => r.artistSlug === artist.slug)
          const liveReleases   = artistReleases.filter((r) => r.status === "live")
          const isArchived     = artist.status === "archived"

          const archiveAction = archiveArtist.bind(null, artist.slug)
          const restoreAction = restoreArtist.bind(null, artist.slug)

          return (
            <div
              key={artist.slug}
              className={`rounded-2xl border overflow-hidden ${
                isArchived ? "border-white/5 bg-[#0d1016]/50 opacity-60" : "border-white/10 bg-[#0d1016]"
              }`}
            >
              <div className="flex items-start gap-5 p-6">
                <ArtistPhotoUpload
                  artistSlug={artist.slug}
                  artistInitial={artist.name.charAt(0)}
                  currentImageUrl={artist.profileImageUrl}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-semibold">{artist.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_CLS[artist.status ?? "active"] ?? STATUS_CLS.active}`}>
                        {artist.status ?? "active"}
                      </span>
                      {artist.featured && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/40">
                          featured
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Link
                        href={`/admin/artists/${artist.slug}/edit`}
                        className="text-xs text-white/40 hover:text-white transition"
                      >
                        Edit
                      </Link>
                      {!isArchived && (
                        <Link
                          href={`/artists/${artist.slug}`}
                          className="text-xs text-white/40 hover:text-white transition"
                        >
                          Public →
                        </Link>
                      )}
                      {isArchived ? (
                        <form action={restoreAction}>
                          <button
                            type="submit"
                            className="text-xs text-emerald-400/70 hover:text-emerald-400 transition"
                          >
                            Restore
                          </button>
                        </form>
                      ) : (
                        <form action={archiveAction}>
                          <button
                            type="submit"
                            className="text-xs text-red-400/50 hover:text-red-400 transition"
                          >
                            Archive
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-sm text-white/50">{artist.role} · {artist.genre}</p>
                  <p className="mt-3 text-sm text-white/50 leading-6 max-w-2xl line-clamp-2">{artist.bio}</p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Live Releases", value: liveReleases.length.toString() },
                      { label: "All Releases",  value: artistReleases.length.toString() },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                        <div className="text-xs text-white/30 uppercase tracking-[0.12em] mb-0.5">{label}</div>
                        <div className="text-sm font-medium">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {artist.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/35"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

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
      </div>
    </main>
  )
}
