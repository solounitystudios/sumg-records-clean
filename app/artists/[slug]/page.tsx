import { notFound } from "next/navigation"
import Link from "next/link"
import { artists, getArtist, getArtistReleases, formatStreams } from "@/lib/data"

export async function generateStaticParams() {
  return artists.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = getArtist(slug)
  if (!artist) return { title: "Artist Not Found — SUMG Records" }
  return { title: `${artist.name} — SUMG Records` }
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = getArtist(slug)
  if (!artist) notFound()

  const artistReleases = getArtistReleases(artist.slug)

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <Link
          href="/artists"
          className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white transition"
        >
          ← All Artists
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40 mb-3">{artist.role}</p>
            <h1 className="text-5xl font-semibold md:text-7xl">{artist.name}</h1>
            <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/40">{artist.genre}</p>

            <p className="mt-8 text-base leading-8 text-white/65 max-w-2xl">{artist.bio}</p>

            <div className="mt-8 flex flex-wrap gap-2">
              {artist.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/50"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { value: formatStreams(artist.monthlyListeners), label: "Monthly Listeners" },
                { value: formatStreams(artist.totalStreams), label: "Total Streams" },
                { value: artist.releaseCount.toString(), label: "Releases" },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-2xl font-semibold">{value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-6 self-start">
            <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-5">Releases</h2>
            {artistReleases.length === 0 ? (
              <p className="text-sm text-white/35">No releases yet.</p>
            ) : (
              <div className="space-y-4">
                {artistReleases.map((release) => (
                  <Link
                    key={release.id}
                    href={`/releases`}
                    className="flex items-start gap-4 group"
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-lg"
                      style={{ background: `${release.accentColor}22`, border: `1px solid ${release.accentColor}44` }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium group-hover:text-white/90 transition truncate">
                        {release.title}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {release.type.toUpperCase()} · {release.releaseDate.slice(0, 4)}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            release.status === "live"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : release.status === "scheduled"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-white/8 text-white/35"
                          }`}
                        >
                          {release.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
