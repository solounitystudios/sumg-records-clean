import Link from "next/link"
import { artists, releases, royalties, formatStreams, formatRevenue } from "@/lib/data"

export const metadata = { title: "Admin Dashboard — SUMG Records" }

export default function AdminPage() {
  const totalStreams = artists.reduce((s, a) => s + a.totalStreams, 0)
  const liveReleases = releases.filter((r) => r.status === "live").length
  const draftReleases = releases.filter((r) => r.status === "draft").length
  const q1Revenue = royalties
    .filter((r) => r.period === "2026-Q1")
    .reduce((s, r) => s + r.revenue, 0)

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Overview</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        {[
          { label: "Total Streams", value: formatStreams(totalStreams), sub: "All artists" },
          { label: "Live Releases", value: liveReleases.toString(), sub: `${draftReleases} in draft` },
          { label: "Q1 2026 Revenue", value: formatRevenue(q1Revenue), sub: "Across all artists" },
          { label: "Roster Size", value: artists.length.toString(), sub: "Active artists" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-3">{label}</div>
            <div className="text-3xl font-semibold">{value}</div>
            <div className="mt-1 text-xs text-white/35">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-10">
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium">Artists</h2>
            <Link href="/admin/artists" className="text-xs text-white/40 hover:text-white transition">
              Manage →
            </Link>
          </div>
          <div className="space-y-3">
            {artists.map((artist) => (
              <div key={artist.slug} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{artist.name}</div>
                  <div className="text-xs text-white/35">{artist.role}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm">{formatStreams(artist.monthlyListeners)}</div>
                  <div className="text-xs text-white/35">monthly</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium">Recent Releases</h2>
            <Link href="/admin/releases" className="text-xs text-white/40 hover:text-white transition">
              Command Center →
            </Link>
          </div>
          <div className="space-y-3">
            {releases.slice(0, 5).map((release) => (
              <div key={release.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="shrink-0 w-7 h-7 rounded-lg"
                    style={{
                      background: `${release.accentColor}22`,
                      border: `1px solid ${release.accentColor}44`,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{release.title}</div>
                    <div className="text-xs text-white/35">{release.artistName}</div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
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
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/royalties", label: "Royalty Platform", desc: "Revenue, streams, platform breakdown" },
          { href: "/admin/releases", label: "Release Command Center", desc: "Manage all releases and rollouts" },
          { href: "/admin/artists", label: "Artist Management", desc: "Roster, bios, and stats" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/8 transition"
          >
            <h3 className="text-sm font-medium mb-1">{item.label}</h3>
            <p className="text-xs text-white/40">{item.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
