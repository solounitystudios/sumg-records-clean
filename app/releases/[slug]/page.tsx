import { notFound } from "next/navigation"
import Link from "next/link"
import { getReleases, getReleaseBySlug } from "@/lib/db/releases"
import { getArtistReleases } from "@/lib/db/releases"
import { formatStreams } from "@/lib/data"

export async function generateStaticParams() {
  const releases = await getReleases()
  return releases.map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const release = await getReleaseBySlug(slug)
  if (!release) return { title: "Release Not Found — SUMG Records" }
  return { title: `${release.title} — SUMG Records` }
}

const statusStyle: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-400",
  scheduled: "bg-amber-500/15 text-amber-400",
  draft: "bg-white/8 text-white/35",
  archived: "bg-white/5 text-white/25",
}

export default async function ReleasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const release = await getReleaseBySlug(slug)
  if (!release) notFound()

  const allArtistReleases = await getArtistReleases(release.artistSlug)
  const otherReleases = allArtistReleases.filter((r) => r.slug !== slug)

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <Link
          href="/releases"
          className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white transition"
        >
          ← All Releases
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[release.status]}`}
              >
                {release.status}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-white/35">
                {release.type}
              </span>
            </div>

            <h1 className="text-5xl font-semibold md:text-7xl leading-tight">{release.title}</h1>
            <Link
              href={`/artists/${release.artistSlug}`}
              className="mt-3 inline-block text-lg text-white/60 hover:text-white transition"
            >
              {release.artistName}
            </Link>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Release Date", value: release.releaseDate },
                { label: "Type", value: release.type.toUpperCase() },
                { label: "Streams", value: release.status === "live" ? formatStreams(release.streams) : "—" },
                { label: "Tracks", value: release.tracks.length.toString() },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
                  <div className="text-lg font-semibold">{value}</div>
                </div>
              ))}
            </div>

            {release.tracks.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-5">Track Listing</h2>
                <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
                  <div className="divide-y divide-white/5">
                    {release.tracks.map((track) => (
                      <div
                        key={track.number}
                        className="flex items-center gap-4 px-5 py-4"
                      >
                        <span className="text-white/25 text-sm w-5 text-right shrink-0">
                          {String(track.number).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-sm font-medium text-white/80">
                          {track.title}
                        </span>
                        <span className="text-xs text-white/35 shrink-0">{track.duration}</span>
                        {release.status === "live" && (
                          <span className="text-xs text-white/40 shrink-0 w-14 text-right tabular-nums">
                            {formatStreams(track.streams)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {release.platforms.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">Platforms</h2>
                <div className="flex flex-wrap gap-2">
                  {release.platforms.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.15em] text-white/50"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div
              className="rounded-3xl aspect-square flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at top, ${release.accentColor}33, ${release.accentColor}08), linear-gradient(180deg, #11151c, #090b10)`,
                border: `1px solid ${release.accentColor}33`,
              }}
            >
              <div className="text-center px-6">
                <p className="text-3xl font-semibold mb-2 leading-tight">{release.title}</p>
                <p className="text-sm text-white/40">{release.artistName}</p>
              </div>
            </div>

            {otherReleases.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-5">
                <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">
                  More from {release.artistName}
                </h3>
                <div className="space-y-3">
                  {otherReleases.slice(0, 4).map((r) => (
                    <Link
                      key={r.id}
                      href={`/releases/${r.slug}`}
                      className="flex items-center gap-3 group"
                    >
                      <div
                        className="shrink-0 w-9 h-9 rounded-lg"
                        style={{
                          background: `${r.accentColor}22`,
                          border: `1px solid ${r.accentColor}44`,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium group-hover:text-white/90 transition truncate">
                          {r.title}
                        </div>
                        <div className="text-xs text-white/40">
                          {r.type.toUpperCase()} · {r.releaseDate.slice(0, 4)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
