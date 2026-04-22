import { getReleases } from "@/lib/db/releases"
import { formatStreams } from "@/lib/data"

export const metadata = { title: "Releases — SUMG Records" }

const statusStyle: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-400",
  scheduled: "bg-amber-500/15 text-amber-400",
  draft: "bg-white/8 text-white/35",
  archived: "bg-white/5 text-white/25",
}

export default async function ReleasesPage() {
  const releases = await getReleases()
  const liveReleases = releases.filter((r) => r.status === "live")
  const upcoming = releases.filter((r) => r.status === "scheduled" || r.status === "draft")

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40 mb-3">Discography</p>
          <h1 className="text-4xl font-semibold md:text-6xl">Releases</h1>
          <p className="mt-5 max-w-2xl text-base text-white/60 leading-7">
            The full SUMG catalog — singles, EPs, and albums across all artists.
          </p>
        </div>

        {liveReleases.length > 0 && (
          <div className="mb-14">
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-6">Live</h2>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {liveReleases.map((release) => (
                <div
                  key={release.id}
                  className="rounded-3xl border border-white/10 bg-[#0d1016] overflow-hidden"
                >
                  <div
                    className="aspect-square flex items-end p-6"
                    style={{
                      background: `radial-gradient(circle at top, ${release.accentColor}22, transparent 60%), linear-gradient(180deg, #11151c, #090b10)`,
                    }}
                  >
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full mb-3 inline-block ${statusStyle[release.status]}`}>
                        {release.status}
                      </span>
                      <h3 className="text-xl font-semibold">{release.title}</h3>
                      <p className="mt-1 text-sm text-white/55">{release.artistName}</p>
                    </div>
                  </div>
                  <div className="px-6 py-5 border-t border-white/8">
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-xs uppercase tracking-[0.15em] text-white/35">{release.type}</span>
                      <span className="text-white/50">{release.releaseDate.slice(0, 7)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{formatStreams(release.streams)}</div>
                        <div className="text-xs text-white/35 uppercase tracking-[0.12em]">Total Streams</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{release.tracks.length}</div>
                        <div className="text-xs text-white/35 uppercase tracking-[0.12em]">Tracks</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40 mb-6">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map((release) => (
                <div
                  key={release.id}
                  className="flex items-center justify-between gap-6 rounded-2xl border border-white/10 bg-[#0d1016] px-6 py-5"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl"
                      style={{
                        background: `${release.accentColor}22`,
                        border: `1px solid ${release.accentColor}44`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{release.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{release.artistName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-white/40">{release.releaseDate}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[release.status]}`}>
                      {release.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
