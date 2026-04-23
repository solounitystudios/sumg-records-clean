import Link from "next/link"
import { getRoyalties } from "@/lib/db/royalties"
import { getArtists } from "@/lib/db/artists"
import { formatStreams, formatRevenue } from "@/lib/data"
import { requireAuth } from "@/lib/auth"

export const metadata = { title: "Royalties — Artist Dashboard" }

export default async function DashboardRoyaltiesPage() {
  const user = await requireAuth()
  const isAdmin = user.role === "admin"

  const [allArtists, allRoyalties] = await Promise.all([getArtists(), getRoyalties()])
  const royalties = isAdmin
    ? allRoyalties
    : allRoyalties.filter((r) => r.artistSlug === (user.artistSlug ?? ""))

  const periods = ["2026-Q1", "2025-Q4"]

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <Link href="/dashboard" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← Dashboard
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Artist Portal</p>
        <h1 className="text-3xl font-semibold">Royalties</h1>
        <p className="mt-1 text-sm text-white/50">Earnings breakdown by artist and platform.</p>
      </div>

      {periods.map((period) => {
        const periodData = royalties.filter((r) => r.period === period)
        if (periodData.length === 0) return null
        const total = periodData.reduce((s, r) => s + r.revenue, 0)
        const totalStreams = periodData.reduce((s, r) => s + r.streams, 0)

        return (
          <div key={period} className="mb-10">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-base font-semibold">{period}</h2>
              <div className="text-right">
                <div className="text-sm font-medium text-emerald-400">{formatRevenue(total)}</div>
                <div className="text-xs text-white/35">{formatStreams(totalStreams)} streams</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
              <div className="divide-y divide-white/5">
                {periodData
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((record) => {
                    const artist = allArtists.find((a) => a.slug === record.artistSlug)
                    const share = total > 0 ? ((record.revenue / total) * 100).toFixed(1) : "0.0"
                    return (
                      <div key={record.artistSlug} className="px-6 py-5">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div>
                            <div className="text-sm font-medium">{record.artistName}</div>
                            <div className="text-xs text-white/35">{artist?.role}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-emerald-400">{formatRevenue(record.revenue)}</div>
                            <div className="text-xs text-white/35">{formatStreams(record.streams)} streams{!isAdmin ? "" : ` · ${share}%`}</div>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="w-full bg-white/5 rounded-full h-1 mb-3">
                            <div
                              className="bg-emerald-500 h-1 rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {record.platforms.map((p) => (
                            <div key={p.platform} className="rounded-xl border border-white/8 bg-white/3 px-3 py-2">
                              <div className="text-xs text-white/35 mb-1">{p.platform}</div>
                              <div className="text-xs font-medium">{formatRevenue(p.revenue)}</div>
                              <div className="text-xs text-white/30">{formatStreams(p.streams)} streams</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )
      })}

      {royalties.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
          No royalty data available yet.
        </div>
      )}
    </main>
  )
}
