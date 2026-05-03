import Link from "next/link"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const metadata = { title: "Revenue — SUMG Admin" }

async function getRevenueData() {
  await requireAdmin()

  const [royaltiesRes, financeRes, ytEstRes, artistsRes] = await Promise.all([
    supabase.from("royalties").select("period, artist_slug, artist_name, streams, revenue, platforms").order("period", { ascending: false }).limit(100),
    supabase.from("finance_transactions").select("*").order("transaction_date", { ascending: false }).limit(200),
    supabase.from("yt_upload_jobs").select("estimated_revenue_usd, producer_slug, uploaded_at").not("estimated_revenue_usd", "is", null).order("uploaded_at", { ascending: false }).limit(200),
    supabase.from("artists").select("slug, name").neq("status", "archived"),
  ])

  return {
    royalties:   royaltiesRes.data   ?? [],
    transactions: financeRes.data    ?? [],
    ytJobs:      ytEstRes.data       ?? [],
    artists:     artistsRes.data     ?? [],
  }
}

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
}

function fmtExact(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export default async function RevenuePage() {
  const { royalties, transactions, ytJobs, artists } = await getRevenueData()

  // Finance totals
  const income  = transactions.filter((t) => t.type === "income")
  const expense = transactions.filter((t) => t.type === "expense")
  const totalIn  = income.reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = expense.reduce((s, t) => s + Number(t.amount), 0)
  const net = totalIn - totalOut

  // Royalties by period
  const periodMap = new Map<string, { streams: number; revenue: number }>()
  for (const r of royalties) {
    const cur = periodMap.get(r.period) ?? { streams: 0, revenue: 0 }
    cur.streams += r.streams ?? 0
    cur.revenue += Number(r.revenue) ?? 0
    periodMap.set(r.period, cur)
  }
  const periods = [...periodMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6)
  const totalRoyaltyRevenue = royalties.reduce((s, r) => s + Number(r.revenue ?? 0), 0)

  // Royalties by artist
  const artistMap = new Map<string, { name: string; revenue: number; streams: number }>()
  for (const r of royalties) {
    const cur = artistMap.get(r.artist_slug) ?? { name: r.artist_name, revenue: 0, streams: 0 }
    cur.revenue += Number(r.revenue ?? 0)
    cur.streams += r.streams ?? 0
    artistMap.set(r.artist_slug, cur)
  }
  const topArtists = [...artistMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8)

  // YT estimated earnings
  const ytTotal = ytJobs.reduce((s, j) => s + Number(j.estimated_revenue_usd ?? 0), 0)

  // Finance by category
  const catMap = new Map<string, number>()
  for (const t of income) {
    const cur = catMap.get(t.category ?? "other") ?? 0
    catMap.set(t.category ?? "other", cur + Number(t.amount))
  }
  const topCategories = [...catMap.entries()].sort((a, b) => b[1] - a[1])

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / Business</p>
          <h1 className="text-3xl font-semibold tracking-tight">Revenue</h1>
          <p className="mt-2 text-sm text-white/40">Royalties, finance transactions, and YouTube estimates.</p>
        </div>
        <Link href="/admin/finance" className="rounded-full border border-white/15 px-4 py-2 text-xs font-mono text-white/50 hover:border-white/30 hover:text-white/80 transition-all duration-150">
          Add Transaction →
        </Link>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total Income",        value: fmt(totalIn),            accent: "border-l-emerald-500/50", color: "text-emerald-400" },
          { label: "Total Expenses",      value: fmt(totalOut),           accent: "border-l-red-500/40",    color: "text-red-400" },
          { label: "Net",                 value: fmt(net),                accent: net >= 0 ? "border-l-emerald-500/50" : "border-l-red-500/40", color: net >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Royalty Revenue",     value: fmt(totalRoyaltyRevenue), accent: "border-l-purple-500/40", color: "text-purple-400" },
        ].map(({ label, value, accent, color }) => (
          <div key={label} className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-5`}>
            <div className={`absolute inset-y-0 left-0 w-[2px] rounded-l-2xl ${accent}`} />
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/30 mb-2 font-mono">{label}</div>
            <div className={`text-2xl font-semibold tabular-nums font-mono ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {ytTotal > 0 && (
        <div className="mb-8 rounded-2xl border border-red-500/15 bg-red-500/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono mb-1">YouTube Estimated Earnings</div>
              <div className="text-2xl font-semibold tabular-nums font-mono text-red-400/80">{fmt(ytTotal)}</div>
              <div className="text-[9px] text-white/25 font-mono mt-1">from {ytJobs.length} uploaded jobs · estimates only</div>
            </div>
            <Link href="/admin/youtube/jobs" className="text-[9px] font-mono text-red-400/40 hover:text-red-400/80 transition-colors duration-150">
              View Jobs →
            </Link>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Royalties by period */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono">Royalties by Period</p>
            <Link href="/admin/royalties" className="text-[9px] font-mono text-white/25 hover:text-white/60 transition-colors duration-150">
              All →
            </Link>
          </div>
          {periods.length === 0 ? (
            <p className="text-xs text-white/20 font-mono">No royalty data. <Link href="/admin/imports" className="text-sky-400/50 hover:text-sky-400/80">Import now →</Link></p>
          ) : (
            <div className="space-y-3">
              {periods.map(([period, data]) => {
                const maxRev = Math.max(...periods.map(([, d]) => d.revenue))
                const pct = maxRev > 0 ? (data.revenue / maxRev) * 100 : 0
                return (
                  <div key={period}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-white/50">{period}</span>
                      <span className="text-[10px] font-mono text-white/60 tabular-nums">{fmtExact(data.revenue)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-purple-400/50 transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[9px] text-white/25 font-mono mt-0.5">{(data.streams ?? 0).toLocaleString()} streams</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top artists by royalties */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-5">
          <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono mb-4">Top Artists — Royalties</p>
          {topArtists.length === 0 ? (
            <p className="text-xs text-white/20 font-mono">No royalty data yet.</p>
          ) : (
            <div className="space-y-3">
              {topArtists.map(([slug, data]) => {
                const maxRev = topArtists[0]?.[1].revenue ?? 1
                const pct = maxRev > 0 ? (data.revenue / maxRev) * 100 : 0
                return (
                  <div key={slug}>
                    <div className="flex items-center justify-between mb-1">
                      <Link href={`/admin/artists/${slug}/edit`} className="text-[10px] font-mono text-white/60 hover:text-white/80 transition-colors duration-150">{data.name}</Link>
                      <span className="text-[10px] font-mono text-white/50 tabular-nums">{fmtExact(data.revenue)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-emerald-400/40 transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Income by category */}
      {topCategories.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-5 mb-6">
          <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono mb-4">Income by Category</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topCategories.slice(0, 8).map(([cat, amount]) => (
              <div key={cat}>
                <p className="text-xs font-mono text-white/50 capitalize">{cat.replace(/_/g, " ")}</p>
                <p className="text-sm font-mono font-semibold tabular-nums text-emerald-400/80 mt-0.5">{fmt(amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
          <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono">Recent Transactions</p>
          <Link href="/admin/finance" className="text-[9px] font-mono text-white/25 hover:text-white/60 transition-colors duration-150">All →</Link>
        </div>
        {transactions.slice(0, 10).map((t, i) => (
          <div key={t.id} className={`flex items-center justify-between px-5 py-3.5 ${i > 0 ? "border-t border-white/[0.04]" : ""}`}>
            <div>
              <p className="text-xs text-white/65">{t.description || t.category}</p>
              <p className="text-[9px] text-white/25 font-mono">{t.transaction_date} · {t.category}</p>
            </div>
            <span className={`text-sm font-mono font-semibold tabular-nums ${t.type === "income" ? "text-emerald-400/80" : "text-red-400/70"}`}>
              {t.type === "income" ? "+" : "-"}{fmtExact(Number(t.amount))}
            </span>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-xs text-white/20 font-mono">No transactions yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}
