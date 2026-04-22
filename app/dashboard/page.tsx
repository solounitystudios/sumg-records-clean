import Link from "next/link"
import { formatStreams, formatRevenue } from "@/lib/data"
import { getArtists, getArtistBySlug } from "@/lib/db/artists"
import { getReleases, getArtistReleases } from "@/lib/db/releases"
import { getRoyalties } from "@/lib/db/royalties"
import { getSession } from "@/lib/auth"

export const metadata = { title: "Artist Dashboard — SUMG Records" }

export default async function DashboardPage() {
  const session = await getSession()
  const isAdmin = session?.role === "admin"

  const [allArtists, allReleases, allRoyalties] = await Promise.all([
    getArtists(),
    isAdmin ? getReleases() : getArtistReleases(session!.sub),
    getRoyalties(),
  ])

  // For artist role, scope everything to their slug
  const artists = isAdmin ? allArtists : allArtists.filter((a) => a.slug === session!.sub)
  const releases = allReleases
  const royalties = isAdmin
    ? allRoyalties
    : allRoyalties.filter((r) => r.artistSlug === session!.sub)

  const q1Royalties = royalties.filter((r) => r.period === "2026-Q1")
  const totalQ1Revenue = q1Royalties.reduce((s, r) => s + r.revenue, 0)
  const totalQ1Streams = q1Royalties.reduce((s, r) => s + r.streams, 0)
  const liveReleases = releases.filter((r) => r.status === "live")
  const scheduledReleases = releases.filter((r) => r.status === "scheduled")

  const artistName = isAdmin ? null : artists[0]?.name

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Artist Portal</p>
        <h1 className="text-3xl font-semibold">
          {isAdmin ? "Dashboard" : artistName ?? "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-white/50">SUMG Records · Q1 2026</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        {[
          { label: "Q1 Revenue", value: formatRevenue(totalQ1Revenue), sub: isAdmin ? "All artists combined" : "Your earnings" },
          { label: "Q1 Streams", value: formatStreams(totalQ1Streams), sub: "Across all platforms" },
          { label: "Live Releases", value: liveReleases.length.toString(), sub: "In active catalog" },
          { label: "Upcoming", value: scheduledReleases.length.toString(), sub: "Scheduled releases" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-3">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
            <div className="mt-1 text-xs text-white/35">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-10">
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium">
              {isAdmin ? "Artist Earnings — Q1 2026" : "Your Earnings — Q1 2026"}
            </h2>
            <Link href="/dashboard/royalties" className="text-xs text-white/40 hover:text-white transition">
              Full breakdown →
            </Link>
          </div>
          {q1Royalties.length === 0 ? (
            <p className="text-sm text-white/35">No royalty data yet for this period.</p>
          ) : (
            <div className="space-y-3">
              {q1Royalties
                .sort((a, b) => b.revenue - a.revenue)
                .map((record) => {
                  const artist = allArtists.find((a) => a.slug === record.artistSlug)
                  return (
                    <div key={record.artistSlug} className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{record.artistName}</div>
                        <div className="text-xs text-white/35">{artist?.role}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm text-emerald-400">{formatRevenue(record.revenue)}</div>
                        <div className="text-xs text-white/35">{formatStreams(record.streams)} streams</div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium">Active Releases</h2>
            <Link href="/dashboard/releases" className="text-xs text-white/40 hover:text-white transition">
              All releases →
            </Link>
          </div>
          {liveReleases.length === 0 ? (
            <p className="text-sm text-white/35">No live releases yet.</p>
          ) : (
            <div className="space-y-3">
              {liveReleases.map((release) => (
                <Link
                  key={release.id}
                  href={`/releases/${release.slug}`}
                  className="flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="shrink-0 w-8 h-8 rounded-lg"
                      style={{
                        background: `${release.accentColor}22`,
                        border: `1px solid ${release.accentColor}44`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-white/90 transition">{release.title}</div>
                      <div className="text-xs text-white/35">{release.artistName}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm">{formatStreams(release.streams)}</div>
                    <div className="text-xs text-white/35">{release.type}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {scheduledReleases.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="text-sm font-medium text-amber-300 mb-4">Upcoming Releases</h2>
          <div className="space-y-3">
            {scheduledReleases.map((release) => (
              <div key={release.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="shrink-0 w-8 h-8 rounded-lg"
                    style={{
                      background: `${release.accentColor}22`,
                      border: `1px solid ${release.accentColor}44`,
                    }}
                  />
                  <div>
                    <div className="text-sm font-medium">{release.title}</div>
                    <div className="text-xs text-white/35">{release.artistName} · {release.type}</div>
                  </div>
                </div>
                <span className="text-xs text-amber-400">{release.releaseDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
