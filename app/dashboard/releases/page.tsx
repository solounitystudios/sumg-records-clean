import Link from "next/link"
import { getReleases, getArtistReleases } from "@/lib/db/releases"
import { formatStreams } from "@/lib/data"
import { requireAuth } from "@/lib/auth"

export const metadata = { title: "Releases — Artist Dashboard" }

const statusStyle: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-400",
  scheduled: "bg-amber-500/15 text-amber-400",
  draft: "bg-white/8 text-white/35",
  archived: "bg-white/5 text-white/25",
}

export default async function DashboardReleasesPage() {
  const user = await requireAuth()
  const isAdmin = user.role === "admin"

  const releases = isAdmin
    ? await getReleases()
    : await getArtistReleases(user.artistSlug ?? "")

  const sorted = [...releases].sort((a, b) => {
    const order = { live: 0, scheduled: 1, draft: 2, archived: 3 }
    return order[a.status] - order[b.status]
  })

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <Link href="/dashboard" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← Dashboard
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Artist Portal</p>
        <h1 className="text-3xl font-semibold">Releases</h1>
        <p className="mt-1 text-sm text-white/50">
          {isAdmin ? "All SUMG releases and their current status." : "Your releases and their current status."}
        </p>
      </div>

      {sorted.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
          No releases yet.
        </div>
      )}

      <div className="space-y-4">
        {sorted.map((release) => (
          <div
            key={release.id}
            className="rounded-2xl border border-white/10 bg-[#0d1016] p-6"
          >
            <div className="flex items-start gap-4">
              <div
                className="shrink-0 w-12 h-12 rounded-xl"
                style={{
                  background: `radial-gradient(circle at top, ${release.accentColor}44, ${release.accentColor}11)`,
                  border: `1px solid ${release.accentColor}44`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-base font-semibold">{release.title}</h3>
                    <p className="text-sm text-white/50 mt-0.5">
                      {release.artistName} · {release.type.toUpperCase()} · {release.releaseDate.slice(0, 7)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusStyle[release.status]}`}>
                      {release.status}
                    </span>
                    <Link
                      href={`/releases/${release.slug}`}
                      className="text-xs text-white/40 hover:text-white transition"
                    >
                      View →
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                    <div className="text-xs text-white/30 uppercase tracking-[0.12em] mb-0.5">Streams</div>
                    <div className="font-medium">{release.status === "live" ? formatStreams(release.streams) : "—"}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                    <div className="text-xs text-white/30 uppercase tracking-[0.12em] mb-0.5">Tracks</div>
                    <div className="font-medium">{release.tracks.length}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                    <div className="text-xs text-white/30 uppercase tracking-[0.12em] mb-0.5">Platforms</div>
                    <div className="font-medium">{release.platforms.length > 0 ? release.platforms.length : "—"}</div>
                  </div>
                </div>

                {release.status === "live" && release.tracks.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-white/35 uppercase tracking-[0.15em] mb-2">Top Track</div>
                    {(() => {
                      const top = [...release.tracks].sort((a, b) => b.streams - a.streams)[0]
                      return (
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-white/25">{String(top.number).padStart(2, "0")}</span>
                          <span className="flex-1 text-white/70">{top.title}</span>
                          <span className="text-white/40">{top.duration}</span>
                          <span className="text-white/60">{formatStreams(top.streams)}</span>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {release.platforms.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {release.platforms.map((p) => (
                      <span
                        key={p}
                        className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/35"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
