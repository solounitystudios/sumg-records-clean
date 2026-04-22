import Link from "next/link"
import { getArtists } from "@/lib/db/artists"
import { getReleases } from "@/lib/db/releases"
import { formatStreams } from "@/lib/data"
import ArtistPhotoUpload from "./ArtistPhotoUpload"

export const metadata = { title: "Artist Management — SUMG Admin" }

export default async function ArtistsAdminPage() {
  const [artists, allReleases] = await Promise.all([getArtists(), getReleases()])
  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Artist Management</h1>
        <p className="mt-2 text-sm text-white/50">Roster overview and artist profiles.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-4 mb-10">
        {[
          { label: "Total Artists", value: artists.length.toString() },
          { label: "Total Monthly Listeners", value: formatStreams(artists.reduce((s, a) => s + a.monthlyListeners, 0)) },
          { label: "Total Streams", value: formatStreams(artists.reduce((s, a) => s + a.totalStreams, 0)) },
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
          const liveReleases = artistReleases.filter((r) => r.status === "live")
          return (
            <div
              key={artist.slug}
              className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden"
            >
              <div className="flex items-start gap-5 p-6">
                <ArtistPhotoUpload
                  artistSlug={artist.slug}
                  artistInitial={artist.name.charAt(0)}
                  currentImageUrl={artist.profileImageUrl}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-base font-semibold">{artist.name}</h3>
                      <p className="text-sm text-white/50 mt-0.5">{artist.role} · {artist.genre}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/artists/${artist.slug}`}
                        className="text-xs text-white/40 hover:text-white transition"
                      >
                        Public Profile →
                      </Link>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-white/50 leading-6 max-w-2xl line-clamp-2">{artist.bio}</p>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Monthly Listeners", value: formatStreams(artist.monthlyListeners) },
                      { label: "Total Streams", value: formatStreams(artist.totalStreams) },
                      { label: "Live Releases", value: liveReleases.length.toString() },
                      { label: "All Releases", value: artistReleases.length.toString() },
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
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
