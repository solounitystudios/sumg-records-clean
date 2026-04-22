import { royalties, formatStreams, formatRevenue } from "@/lib/data"
import { getArtists } from "@/lib/db/artists"

export const metadata = { title: "Royalty Platform — SUMG Admin" }

const periods = ["2026-Q1", "2025-Q4"]

export default async function RoyaltiesAdminPage() {
  const artists = await getArtists()
  const q1Data = royalties.filter((r) => r.period === "2026-Q1")
  const q4Data = royalties.filter((r) => r.period === "2025-Q4")

  const q1Total = q1Data.reduce((s, r) => s + r.revenue, 0)
  const q4Total = q4Data.reduce((s, r) => s + r.revenue, 0)
  const totalStreamsQ1 = q1Data.reduce((s, r) => s + r.streams, 0)
  const growth = q4Total > 0 ? (((q1Total - q4Total) / q4Total) * 100).toFixed(1) : "—"

  const platformTotals: Record<string, { streams: number; revenue: number }> = {}
  q1Data.forEach((record) => {
    record.platforms.forEach(({ platform, streams, revenue }) => {
      if (!platformTotals[platform]) platformTotals[platform] = { streams: 0, revenue: 0 }
      platformTotals[platform].streams += streams
      platformTotals[platform].revenue += revenue
    })
  })
  const platformList = Object.entries(platformTotals).sort((a, b) => b[1].revenue - a[1].revenue)

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Royalty Platform</h1>
        <p className="mt-2 text-sm text-white/50">Q1 2026 · All Artists</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        {[
          { label: "Q1 2026 Revenue", value: formatRevenue(q1Total), sub: "Total distributed" },
          { label: "Q4 2025 Revenue", value: formatRevenue(q4Total), sub: "Prior period" },
          { label: "QoQ Growth", value: `${growth}%`, sub: "Revenue change" },
          { label: "Q1 Streams", value: formatStreams(totalStreamsQ1), sub: "Across all platforms" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-3">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
            <div className="mt-1 text-xs text-white/35">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px] mb-10">
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/8">
            <h2 className="text-sm font-medium">Artist Royalty Breakdown — Q1 2026</h2>
          </div>
          <div className="divide-y divide-white/5">
            {q1Data
              .sort((a, b) => b.revenue - a.revenue)
              .map((record) => {
                const artist = artists.find((a) => a.slug === record.artistSlug)
                const share = ((record.revenue / q1Total) * 100).toFixed(1)
                return (
                  <div key={record.artistSlug} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <div className="text-sm font-medium">{record.artistName}</div>
                        <div className="text-xs text-white/35">{artist?.role}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-emerald-400">{formatRevenue(record.revenue)}</div>
                        <div className="text-xs text-white/35">{share}% of total</div>
                      </div>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div
                        className="bg-emerald-400 h-1.5 rounded-full"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {record.platforms.map((p) => (
                        <div key={p.platform} className="text-xs text-white/40">
                          {p.platform}: {formatStreams(p.streams)} / {formatRevenue(p.revenue)}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-5">
            <h2 className="text-sm font-medium mb-4">Platform Totals — Q1 2026</h2>
            <div className="space-y-3">
              {platformList.map(([platform, data]) => (
                <div key={platform}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/60">{platform}</span>
                    <span className="text-white/80">{formatRevenue(data.revenue)}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1">
                    <div
                      className="bg-violet-400 h-1 rounded-full"
                      style={{ width: `${(data.revenue / platformList[0][1].revenue) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-white/30 mt-1">{formatStreams(data.streams)} streams</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-5">
            <h2 className="text-sm font-medium mb-4">Period Comparison</h2>
            <div className="space-y-3">
              {periods.map((period) => {
                const periodData = royalties.filter((r) => r.period === period)
                const total = periodData.reduce((s, r) => s + r.revenue, 0)
                return (
                  <div key={period} className="flex justify-between items-center">
                    <span className="text-xs text-white/50">{period}</span>
                    <span className="text-sm font-medium">{formatRevenue(total)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
