import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import {
  getMonetizationOverview,
  getChannelRevenueSummaries,
  getProducerEarningsBoard,
  getNichePerformance,
  getUnderperformingChannels,
  getUploadRecommendations,
  getProfitHeatmap,
  getSponsorReadinessScores,
  getChannelValuations,
  type SponsorTier,
} from "@/lib/db/monetization"

export const metadata = { title: "Monetization — SUMG Admin" }

// ─── Format helpers ───────────────────────────────────────────────────────────

function usd(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: decimals })
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function pctBar(value: number, max: number, color = "bg-emerald-500/40") {
  const w = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full bg-white/[0.06] rounded-full h-1 overflow-hidden mt-1">
      <div className={`h-1 rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
    </div>
  )
}

// ─── Sponsor tier badges ──────────────────────────────────────────────────────

const TIER_STYLE: Record<SponsorTier, { label: string; cls: string }> = {
  none:  { label: "None",  cls: "border-white/10 text-white/25" },
  micro: { label: "Micro", cls: "border-blue-500/25 text-blue-400/60" },
  mid:   { label: "Mid",   cls: "border-violet-500/30 text-violet-400/70" },
  macro: { label: "Macro", cls: "border-amber-500/35 text-amber-400/70" },
  elite: { label: "Elite", cls: "border-emerald-500/40 text-emerald-400/80" },
}

function TierBadge({ tier }: { tier: SponsorTier }) {
  const s = TIER_STYLE[tier]
  return (
    <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ─── Heatmap cell colors ──────────────────────────────────────────────────────

const HEAT: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-white/[0.03]",
  1: "bg-emerald-500/10",
  2: "bg-emerald-500/25",
  3: "bg-emerald-500/45",
  4: "bg-emerald-500/70",
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{title}</p>
      {sub && <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonetizationPage() {
  await requireAdmin()

  const [overview, revSummaries, earningsBoard, niches, underperforming, recommendations, heatmap, sponsorScores, valuations] =
    await Promise.all([
      getMonetizationOverview(),
      getChannelRevenueSummaries(),
      getProducerEarningsBoard(),
      getNichePerformance(),
      getUnderperformingChannels(),
      getUploadRecommendations(),
      getProfitHeatmap(),
      getSponsorReadinessScores(),
      getChannelValuations(),
    ])

  const maxEarning      = earningsBoard[0]?.estMonthlyRevenue ?? 0
  const maxNicheRpm     = niches[0]?.avgRpm ?? 0
  const maxValuation    = valuations[0]?.valuationUsd ?? 0
  const maxMonthlyRev   = revSummaries[0]?.estMonthlyRevenue ?? 0

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl space-y-12">

      {/* Header */}
      <div>
        <Link href="/admin/youtube"
          className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition mb-3 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">Monetization</h1>
        <p className="text-xs text-white/35 mt-1">Revenue projections, producer earnings, sponsor readiness and channel valuation.</p>
      </div>

      {/* ── KPI overview ─────────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Est. Monthly",   value: usd(overview.estMonthlyRevenue),  accent: "text-emerald-400" },
            { label: "Est. Annual",    value: usd(overview.estAnnualRevenue),   accent: "text-emerald-400/70" },
            { label: "Avg RPM",        value: `$${overview.avgRpm.toFixed(2)}`, accent: "text-blue-400" },
            { label: "Monetized",      value: `${overview.monetizedChannels} / ${overview.totalChannels}` },
            { label: "Best Niche",     value: overview.bestNiche ?? "—", accent: "text-amber-400/70" },
            { label: "Top Channel",    value: overview.topChannel ?? "—", accent: "text-white/60" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="border border-white/[0.07] bg-[#0d1016] p-4 rounded-xl">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-2">{label}</p>
              <p className={`text-base font-semibold tabular-nums truncate ${accent ?? "text-white"}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Revenue estimates table ───────────────────────────────────────────── */}
      <section>
        <SectionHead title="Revenue Estimates" sub="Sorted by estimated monthly revenue — update RPM and views in Channels." />
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-x-auto">
          {revSummaries.length === 0 ? (
            <p className="text-sm text-white/25 py-6 text-center">No channels configured.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["Channel", "Niche", "Subscribers", "RPM", "Views/Upload", "Monthly Views", "Est. Month", "Est. Year"].map((h) => (
                    <th key={h} className="text-left text-[9px] uppercase tracking-[0.15em] text-white/25 px-4 py-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {revSummaries.map((r) => (
                  <tr key={r.channelId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white/75 font-medium">{r.channelHandle ?? r.channelId.slice(0, 8)}</p>
                      <p className="text-[9px] text-white/30 mt-0.5">{r.producerSlug}</p>
                    </td>
                    <td className="px-4 py-3 text-white/40">{r.contentNiche ?? "—"}</td>
                    <td className="px-4 py-3 text-white/50 tabular-nums">{fmt(r.subscriberCount)}</td>
                    <td className="px-4 py-3">
                      <span className={`tabular-nums font-medium ${r.avgRpm >= 4 ? "text-emerald-400/80" : r.avgRpm >= 2 ? "text-white/60" : "text-white/35"}`}>
                        ${r.avgRpm.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/45 tabular-nums">{fmt(r.avgViewsPerUpload)}</td>
                    <td className="px-4 py-3 text-white/45 tabular-nums">{fmt(r.monthlyViews)}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400/80 font-medium tabular-nums">{usd(r.estMonthlyRevenue)}</span>
                      {pctBar(r.estMonthlyRevenue, maxMonthlyRev)}
                    </td>
                    <td className="px-4 py-3 text-white/40 tabular-nums">{usd(r.estAnnualRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Producer earnings board ───────────────────────────────────────────── */}
      <section>
        <SectionHead title="Producer Earnings Board" sub="Ranked by total estimated monthly revenue across all channels." />
        {earningsBoard.length === 0 ? (
          <p className="text-sm text-white/25">No producers.</p>
        ) : (
          <div className="space-y-2">
            {earningsBoard.map((p, i) => (
              <div key={p.producerSlug} className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-5 py-3">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] tabular-nums text-white/20 w-5 shrink-0">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-white/80">{p.producerSlug}</span>
                      <span className="text-[10px] text-white/30">{p.channelCount} ch</span>
                      {p.topChannel && <span className="text-[10px] text-white/20">{p.topChannel}</span>}
                    </div>
                    {pctBar(p.estMonthlyRevenue, maxEarning, "bg-emerald-500/35")}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-emerald-400/80">{usd(p.estMonthlyRevenue)}<span className="text-[9px] text-white/25">/mo</span></p>
                    <p className="text-[10px] text-white/25 tabular-nums">{fmt(p.totalSubscribers)} subs · {fmt(p.totalMonthlyViews)} views</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Niche performance ─────────────────────────────────────────────────── */}
      <section>
        <SectionHead title="Niche Performance" sub="Average RPM by content niche — highest value niches at top." />
        {niches.length === 0 ? (
          <p className="text-sm text-white/25">No niches configured.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {niches.map((n) => (
              <div key={n.niche} className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-white/75 capitalize">{n.niche}</span>
                  <span className={`text-sm font-semibold tabular-nums ${n.avgRpm >= 4 ? "text-emerald-400/80" : n.avgRpm >= 2 ? "text-blue-400/70" : "text-white/40"}`}>
                    ${n.avgRpm.toFixed(2)} RPM
                  </span>
                </div>
                {pctBar(n.avgRpm, maxNicheRpm, "bg-blue-500/35")}
                <div className="flex gap-4 mt-2 text-[10px] text-white/30">
                  <span>{n.channelCount} ch</span>
                  <span>{fmt(n.avgViewsPerUpload)} views/upload</span>
                  <span>{usd(n.estMonthlyRevenue)}/mo</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Underperforming channels ──────────────────────────────────────────── */}
      <section>
        <SectionHead
          title="Underperforming Channels"
          sub={underperforming.length === 0 ? "All channels are performing well." : `${underperforming.length} channel${underperforming.length !== 1 ? "s" : ""} flagged.`}
        />
        {underperforming.length === 0 ? (
          <p className="text-[11px] text-emerald-400/50 py-3">No underperforming channels detected.</p>
        ) : (
          <div className="space-y-2">
            {underperforming.map((ch, i) => (
              <div key={i} className="rounded-xl border border-red-500/15 bg-red-950/10 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/75">{ch.channelHandle ?? ch.producerSlug}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {ch.producerSlug}{ch.contentNiche ? ` · ${ch.contentNiche}` : ""}
                      {" · "}${ch.avgRpm.toFixed(2)} RPM · {fmt(ch.avgViewsPerUpload)} views/upload
                    </p>
                    <ul className="mt-2 space-y-0.5">
                      {ch.reasons.map((r, ri) => (
                        <li key={ri} className="text-[10px] text-red-400/60 flex items-start gap-1.5">
                          <span className="shrink-0 mt-0.5">·</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/admin/youtube/channels"
                    className="text-[10px] text-white/25 hover:text-white/50 transition shrink-0">
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Upload recommendations ────────────────────────────────────────────── */}
      <section>
        <SectionHead
          title="Upload Recommendations"
          sub="High-value channels with room to increase cadence and revenue."
        />
        {recommendations.length === 0 ? (
          <p className="text-[11px] text-white/30 py-3">No recommendations — queues look healthy.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="rounded-xl border border-amber-500/15 bg-amber-950/10 px-4 py-4">
                <p className="text-sm font-medium text-white/80 mb-1">{rec.channelHandle ?? rec.producerSlug}</p>
                <p className="text-[10px] text-white/30 mb-3">
                  {rec.producerSlug}{rec.contentNiche ? ` · ${rec.contentNiche}` : ""}
                  {" · "}${rec.avgRpm.toFixed(2)} RPM
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] border border-white/10 rounded px-1.5 py-0.5 text-white/40">
                    {rec.currentCadence}/day
                  </span>
                  <span className="text-[10px] text-white/20">→</span>
                  <span className="text-[10px] border border-amber-500/30 rounded px-1.5 py-0.5 text-amber-400/70 font-medium">
                    {rec.recommendedCadence}/day
                  </span>
                </div>
                <p className="text-[10px] text-white/35">{rec.reason}</p>
                <p className="mt-2 text-[11px] text-emerald-400/70 font-medium">
                  +{usd(rec.weeklyRevenueGain, 2)}/week
                </p>
                <p className="text-[10px] text-white/20 mt-0.5">Queue: {rec.queueDepth} jobs</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Profit heatmap ────────────────────────────────────────────────────── */}
      <section>
        <SectionHead title="Profit Heatmap" sub="8-week estimated revenue grid — darker = higher revenue." />
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 overflow-x-auto">
          {heatmap.channelHandles.length === 0 ? (
            <p className="text-sm text-white/25 py-4 text-center">No channel data.</p>
          ) : (
            <table className="text-[9px] w-full">
              <thead>
                <tr>
                  <th className="text-left text-white/20 pr-4 font-normal pb-2 whitespace-nowrap">Channel</th>
                  {heatmap.weeks.map((w) => (
                    <th key={w.weekStart} className="text-center text-white/20 font-normal pb-2 px-1 whitespace-nowrap">
                      {w.weekLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="space-y-1">
                {heatmap.channelHandles.map((handle, ci) => (
                  <tr key={ci}>
                    <td className="text-white/40 pr-4 py-1 whitespace-nowrap">{handle ?? `ch-${ci}`}</td>
                    {heatmap.weeks.map((_, wi) => {
                      const cell = heatmap.cells.find((c) => c.weekIndex === wi && c.channelHandle === handle)
                      const rev  = cell?.estRevenue ?? 0
                      const tier = cell?.tier ?? 0
                      return (
                        <td key={wi} className="px-1 py-1">
                          <div
                            title={rev > 0 ? usd(rev, 2) : "no uploads"}
                            className={`w-8 h-5 rounded text-center leading-5 text-[8px] tabular-nums ${HEAT[tier]} ${tier > 0 ? "text-white/60" : "text-white/10"}`}
                          >
                            {tier > 0 ? `$${rev < 1 ? rev.toFixed(1) : Math.round(rev)}` : "·"}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Sponsor readiness scores ──────────────────────────────────────────── */}
      <section>
        <SectionHead
          title="Sponsor Readiness"
          sub="Score 0-100: upload consistency (30) + RPM (25) + subscribers (25) + niche premium (20)."
        />
        {sponsorScores.length === 0 ? (
          <p className="text-sm text-white/25">No channels.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sponsorScores.map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-medium text-white/80">{s.channelHandle ?? s.producerSlug}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{s.producerSlug}</p>
                  </div>
                  <TierBadge tier={s.tier} />
                </div>

                {/* Score bar */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${s.score >= 80 ? "bg-emerald-400/70" : s.score >= 60 ? "bg-amber-400/60" : s.score >= 40 ? "bg-blue-400/50" : "bg-white/20"}`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-white/70 w-8 text-right">{s.score}</span>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    { label: "Consist.", value: s.breakdown.consistency, max: 30 },
                    { label: "RPM",      value: s.breakdown.rpm,         max: 25 },
                    { label: "Subs",     value: s.breakdown.subscribers, max: 25 },
                    { label: "Niche",    value: s.breakdown.nichePremium, max: 20 },
                  ].map(({ label, value, max }) => (
                    <div key={label} className="border border-white/[0.05] rounded py-1.5">
                      <p className="text-[10px] font-semibold tabular-nums text-white/60">{value}</p>
                      <p className="text-[8px] text-white/20 mt-0.5">{label}</p>
                      <p className="text-[8px] text-white/15">/{max}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Channel valuation scores ──────────────────────────────────────────── */}
      <section>
        <SectionHead
          title="Channel Valuation"
          sub="Estimated channel value: (annual revenue est.) × niche multiplier × 2.5."
        />
        {valuations.length === 0 ? (
          <p className="text-sm text-white/25">No channels.</p>
        ) : (
          <div className="space-y-2">
            {valuations.map((v, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-5 py-3">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] tabular-nums text-white/20 w-5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-white/80">{v.channelHandle ?? v.producerSlug}</span>
                      <span className="text-[10px] text-white/30">{v.producerSlug}</span>
                      {v.contentNiche && <span className="text-[10px] text-white/20 capitalize">{v.contentNiche}</span>}
                      <span className="text-[9px] border border-white/10 rounded px-1 py-0.5 text-white/20">
                        {v.nicheMultiplier}× niche
                      </span>
                    </div>
                    {pctBar(v.valuationUsd, maxValuation, "bg-violet-500/30")}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-violet-400/80">{usd(v.valuationUsd)}</p>
                    <p className="text-[10px] text-white/25 tabular-nums">
                      {fmt(v.subscriberCount)} subs · {usd(v.annualRevenueEst)}/yr est.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
