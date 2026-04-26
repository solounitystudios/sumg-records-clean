import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getOptimizerData, type GrowthActionType } from "@/lib/db/optimizer"

export const metadata = { title: "Optimizer — SUMG Admin" }

// ─── Format helpers ───────────────────────────────────────────────────────────

function usd(n: number, d = 0) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d })
}
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}
function pct(n: number) { return `${Math.round(n * 100)}%` }

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const URGENCY = {
  critical: { dot: "bg-red-500",    ring: "border-red-500/20  bg-red-950/10",  label: "Critical", text: "text-red-400/80"    },
  high:     { dot: "bg-amber-400",  ring: "border-amber-500/20 bg-amber-950/10", label: "High",   text: "text-amber-400/80"  },
  medium:   { dot: "bg-blue-400",   ring: "border-blue-500/20  bg-blue-950/10",  label: "Medium", text: "text-blue-400/70"   },
} as const

function UrgencyDot({ u }: { u: keyof typeof URGENCY }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${URGENCY[u].dot}`} />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-[0.22em] text-white/30 mb-4">{children}</p>
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.07] bg-[#0d1016] ${className}`}>
      {children}
    </div>
  )
}

function MiniBar({ value, max, color = "bg-emerald-500/40" }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full bg-white/[0.05] rounded-full h-1 overflow-hidden mt-1">
      <div className={`h-1 rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
    </div>
  )
}

// ─── Action type labels ───────────────────────────────────────────────────────

const ACTION_LABEL: Record<GrowthActionType, string> = {
  connect_oauth:       "OAuth",
  sync_analytics:      "Sync",
  clear_bottleneck:    "Bottleneck",
  fill_queue:          "Queue",
  increase_cadence:    "Cadence",
  enable_monetization: "Monetize",
  recover_channel:     "Recovery",
}

// ─── Heat cell colors (upload time grid) ─────────────────────────────────────

const HEAT_CLS: Record<number, string> = {
  0: "bg-white/[0.02] text-white/10",
  1: "bg-emerald-900/30 text-emerald-400/30",
  2: "bg-emerald-800/40 text-emerald-400/50",
  3: "bg-emerald-700/55 text-emerald-300/70",
  4: "bg-emerald-500/70 text-white/90",
}

function heatTier(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score === 0)   return 0
  if (score < 20)    return 1
  if (score < 45)    return 2
  if (score < 75)    return 3
  return 4
}

const DAY_LABELS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const BLOCK_LABELS = ["0–4am", "4–8am", "8am–Noon", "Noon–4pm", "4–8pm", "8pm–Mid"]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OptimizerPage() {
  await requireAdmin()

  const d = await getOptimizerData()

  const maxOpp  = d.opportunityBoard[0]?.opportunityUsd ?? 0
  const maxNiche = d.nicheMatrix[0]?.compositeScore      ?? 0

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl space-y-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <Link href="/admin/youtube"
          className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition mb-3 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">Optimization Brain</h1>
        <p className="text-xs text-white/35 mt-1">
          Deterministic analysis of upload performance, revenue opportunity, and channel health.
          No AI — pure signal.
        </p>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Actions Found",         value: String(d.actionsFound),               accent: d.actionsFound > 0 ? "text-amber-400" : "text-white/50" },
          { label: "Revenue at Risk",        value: usd(d.totalRevenueAtRisk),            accent: d.totalRevenueAtRisk > 0 ? "text-red-400/80" : "text-white/50" },
          { label: "Channels Flagged",       value: String(d.channelsNeedingAction),      accent: d.channelsNeedingAction > 0 ? "text-amber-400/80" : "text-white/50" },
          { label: "Top Opportunity",        value: usd(d.topOpportunityUsd),             accent: "text-emerald-400/80" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="border border-white/[0.07] bg-[#0d1016] p-4 rounded-xl">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-2">{label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          1. GROWTH PRIORITY QUEUE
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Growth Priority Queue — ranked by urgency × monthly revenue impact</SectionLabel>
        {d.growthQueue.length === 0 ? (
          <Card className="px-6 py-8 text-center">
            <p className="text-sm text-emerald-400/60">No actions needed — pipeline is healthy.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {d.growthQueue.map((action, i) => {
              const u = URGENCY[action.urgency]
              return (
                <div key={action.id}
                  className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${u.ring}`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-[10px] tabular-nums text-white/20 w-4 shrink-0 pt-0.5">#{i + 1}</span>
                    <UrgencyDot u={action.urgency} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-white/80 truncate">{action.title}</span>
                        <span className={`text-[9px] border border-current/30 px-1.5 py-0.5 rounded uppercase tracking-wide ${u.text}`}>
                          {ACTION_LABEL[action.type]}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/35 leading-relaxed">{action.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 pl-7 sm:pl-0">
                    {action.impactUsd > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-emerald-400/80">{usd(action.impactUsd)}</p>
                        <p className="text-[9px] text-white/20">est. monthly</p>
                      </div>
                    )}
                    <Link href={action.href}
                      className="text-[10px] text-white/35 hover:text-white/70 transition whitespace-nowrap border border-white/10 rounded px-2.5 py-1">
                      {action.cta}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. OPPORTUNITY BOARD  +  DEAD CHANNEL RECOVERY
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-8 md:grid-cols-2">

        {/* Producer Opportunity Board */}
        <section>
          <SectionLabel>Producer Opportunity Board</SectionLabel>
          <p className="text-[10px] text-white/20 -mt-2 mb-4">
            Revenue left on the table from missed uploads in the last 28 days.
            <br/>Formula: <span className="font-mono">(RPM × views/upload / 1000) × (cadence×28 − actual uploads)</span>
          </p>
          {d.opportunityBoard.length === 0 ? (
            <Card className="px-5 py-6 text-center"><p className="text-sm text-white/25">No active channels.</p></Card>
          ) : (
            <div className="space-y-2">
              {d.opportunityBoard.slice(0, 8).map((o, i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-4 py-3">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-white/20">#{i + 1}</span>
                        <span className="text-sm font-medium text-white/80 truncate">
                          {o.channelHandle ?? o.producerSlug}
                        </span>
                        {o.contentNiche && (
                          <span className="text-[9px] text-white/25 capitalize">{o.contentNiche}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {o.uploadedLast28d} / {o.capacityLast28d} uploads · {o.gapUploads} gap · {usd(o.revPerUpload, 2)}/upload
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold tabular-nums ${o.opportunityUsd > 50 ? "text-amber-400/80" : "text-white/40"}`}>
                        {usd(o.opportunityUsd)}
                      </p>
                      <p className="text-[9px] text-white/20">opportunity</p>
                    </div>
                  </div>
                  <MiniBar value={o.opportunityUsd} max={maxOpp} color="bg-amber-500/35" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dead Channel Recovery */}
        <section>
          <SectionLabel>Dead Channel Recovery</SectionLabel>
          <p className="text-[10px] text-white/20 -mt-2 mb-4">
            Active channels with unexpected upload silence.
            <br/>Formula: <span className="font-mono">silence_days &gt; max(7, round(14 / cadence))</span>
          </p>
          {d.deadChannels.length === 0 ? (
            <Card className="px-5 py-6 text-center">
              <p className="text-sm text-emerald-400/50">All channels uploading on schedule.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {d.deadChannels.map((dc, i) => {
                const u = URGENCY[dc.urgency]
                return (
                  <div key={i} className={`rounded-xl border px-4 py-3 ${u.ring}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <UrgencyDot u={dc.urgency} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white/80">
                            {dc.channelHandle ?? dc.producerSlug}
                          </span>
                          <span className={`text-[9px] ${u.text}`}>
                            {dc.silenceDays < 0 ? "Never uploaded" : `${dc.silenceDays}d silent`}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/35 mt-0.5">{dc.diagnosis}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pl-3.5">
                      <p className="text-[9px] text-white/25">{dc.recoveryAction}</p>
                      <Link href={dc.recoveryHref}
                        className="text-[9px] text-white/30 hover:text-white/60 transition whitespace-nowrap shrink-0">
                        Fix →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. BEST UPLOAD TIME ENGINE
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Best Upload Time Engine</SectionLabel>
        <p className="text-[10px] text-white/20 -mt-2 mb-4">
          {d.uploadTimeEngine.hasRealData
            ? "Scores derived from actual view_count data on uploaded jobs. Buckets with < 3 data points fall back to industry benchmarks."
            : "No view data synced yet — showing industry benchmarks for music content (UTC). Run analytics sync to replace with real signal."}
        </p>
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">

          {/* Heatmap grid */}
          <Card className="p-5 overflow-x-auto">
            <table className="text-[9px] w-full">
              <thead>
                <tr>
                  <th className="text-white/20 font-normal text-left pr-3 pb-2 w-10" />
                  {BLOCK_LABELS.map((b) => (
                    <th key={b} className="text-center text-white/20 font-normal pb-2 px-0.5 whitespace-nowrap">{b}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAY_LABELS.map((day, dow) => (
                  <tr key={day}>
                    <td className="text-white/35 pr-3 py-0.5 whitespace-nowrap">{day}</td>
                    {BLOCK_LABELS.map((_, block) => {
                      const cell  = d.uploadTimeEngine.cells.find((c) => c.dow === dow && c.block === block)
                      const score = cell?.score ?? 0
                      const tier  = heatTier(score)
                      const isTop = d.uploadTimeEngine.topSlots.some((s) => s.dow === dow && s.block === block)
                      return (
                        <td key={block} className="px-0.5 py-0.5">
                          <div
                            title={`${day} ${BLOCK_LABELS[block]} — score ${score}${cell?.isReal ? `, ${cell.dataPoints} uploads` : " (benchmark)"}`}
                            className={`w-14 h-6 rounded flex items-center justify-center text-[8px] tabular-nums relative ${HEAT_CLS[tier]} ${isTop ? "ring-1 ring-white/30" : ""}`}
                          >
                            {score > 0 ? score : "·"}
                            {isTop && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white/50 rounded-full" />}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[9px] text-white/20">
              Score 0–100. ◉ = top 3 recommended slots.
              {d.uploadTimeEngine.hasRealData ? " Real data." : " Benchmark."}
            </p>
          </Card>

          {/* Top 3 slots */}
          <div className="space-y-2 min-w-[180px]">
            <p className="text-[9px] uppercase tracking-[0.15em] text-white/25 mb-3">Top Slots</p>
            {d.uploadTimeEngine.topSlots.map((slot, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-3 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] text-white/20">#{i + 1}</span>
                  <span className={`text-xs font-semibold tabular-nums ${slot.score >= 75 ? "text-emerald-400/80" : "text-white/60"}`}>
                    {slot.score}
                  </span>
                </div>
                <p className="text-[10px] font-medium text-white/70">{DAY_LABELS[slot.dow]}</p>
                <p className="text-[9px] text-white/35">{BLOCK_LABELS[slot.block]} UTC</p>
                {slot.isReal && slot.dataPoints > 0 && (
                  <p className="text-[8px] text-emerald-400/40 mt-1">{slot.dataPoints} uploads</p>
                )}
                {!slot.isReal && (
                  <p className="text-[8px] text-white/20 mt-1">benchmark</p>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. AUTO CADENCE SUGGESTIONS  +  A/B TEST RECOMMENDATIONS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-8 md:grid-cols-2">

        {/* Auto Cadence */}
        <section>
          <SectionLabel>Auto Cadence Suggestions</SectionLabel>
          <p className="text-[10px] text-white/20 -mt-2 mb-4">
            Formula: <span className="font-mono">rev ≥ $4 → scale×1.5 · rev ≥ $1.50 → hold · rev &lt; $1.50 → reduce</span>
          </p>
          {d.cadenceSuggestions.length === 0 ? (
            <Card className="px-5 py-6 text-center"><p className="text-sm text-white/25">No active channels.</p></Card>
          ) : (
            <div className="space-y-2">
              {d.cadenceSuggestions.slice(0, 8).map((s, i) => {
                const actionColor =
                  s.action === "increase" ? "text-emerald-400/70 border-emerald-500/25" :
                  s.action === "reduce"   ? "text-red-400/60    border-red-500/20"      :
                                            "text-white/30      border-white/10"
                return (
                  <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-white/80 truncate">
                            {s.channelHandle ?? s.producerSlug}
                          </span>
                          <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide ${actionColor}`}>
                            {s.action}
                          </span>
                        </div>
                        <p className="text-[9px] text-white/30 leading-relaxed">{s.reason}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold tabular-nums text-white/50">{s.currentCadence}</span>
                          {s.optimalCadence !== s.currentCadence && (
                            <>
                              <span className="text-[9px] text-white/20">→</span>
                              <span className={`text-sm font-semibold tabular-nums ${s.action === "increase" ? "text-emerald-400/80" : "text-red-400/70"}`}>
                                {s.optimalCadence}
                              </span>
                            </>
                          )}
                          <span className="text-[9px] text-white/20">/day</span>
                        </div>
                        {s.weeklyRevDelta !== 0 && (
                          <p className={`text-[9px] tabular-nums ${s.weeklyRevDelta > 0 ? "text-emerald-400/60" : "text-red-400/50"}`}>
                            {s.weeklyRevDelta > 0 ? "+" : ""}{usd(s.weeklyRevDelta, 2)}/wk
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* A/B Test Recommendations */}
        <section>
          <SectionLabel>A/B Test Recommendations</SectionLabel>
          <p className="text-[10px] text-white/20 -mt-2 mb-4">
            Variance detected via <span className="font-mono">CoV = σ / μ</span> on view counts. ≥ {5} synced uploads required per channel.
          </p>
          {d.abRecommendations.length === 0 ? (
            <Card className="px-5 py-6 text-center">
              <p className="text-sm text-white/25">No channels with upload history.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {d.abRecommendations.slice(0, 8).map((r, i) => {
                const typeColor =
                  r.type === "variance_pattern" ? "border-violet-500/25 text-violet-400/70" :
                  r.type === "high_ctr_queued"  ? "border-emerald-500/25 text-emerald-400/70" :
                                                   "border-white/10 text-white/25"
                return (
                  <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium text-white/75 truncate">
                        {r.channelHandle ?? r.producerSlug}
                      </span>
                      <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${typeColor}`}>
                        {r.type === "variance_pattern" ? "A/B" :
                         r.type === "high_ctr_queued"  ? "CTR" : "Data"}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-white/60 mb-0.5">{r.insight}</p>
                    <p className="text-[9px] text-white/30 leading-relaxed">{r.detail}</p>
                    {r.type === "needs_data" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-white/[0.05] rounded-full h-1 overflow-hidden">
                          <div
                            className="h-1 rounded-full bg-white/20"
                            style={{ width: `${Math.round((r.syncedJobs / r.requiredJobs) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[8px] text-white/20 shrink-0">{r.syncedJobs}/{r.requiredJobs}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          5. NICHE WINNER MATRIX
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel>Niche Winner Matrix</SectionLabel>
        <p className="text-[10px] text-white/20 -mt-2 mb-4">
          Composite score (0–100): RPM (×40) + views/upload (×30) + upload consistency (×20) + monetization rate (×10).
          All sub-scores are normalised to the top channel in that metric.
        </p>
        <Card className="overflow-x-auto">
          {d.nicheMatrix.length === 0 ? (
            <p className="text-sm text-white/25 py-6 text-center">No niches configured.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["Niche", "Composite", "RPM ×40", "Views ×30", "Consistency ×20", "Monetization ×10", "Channels", "Avg RPM", "Views/Upload"].map((h) => (
                    <th key={h} className="text-left text-[9px] uppercase tracking-[0.12em] text-white/25 px-4 py-3 font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {d.nicheMatrix.map((n, i) => (
                  <tr key={n.niche} className="hover:bg-white/[0.015] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/20 w-4">{i + 1}</span>
                        <span className="text-white/75 font-medium capitalize">{n.niche}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold tabular-nums ${n.compositeScore >= 70 ? "text-emerald-400/80" : n.compositeScore >= 40 ? "text-white/60" : "text-white/30"}`}>
                          {n.compositeScore}
                        </span>
                        <div className="w-12 bg-white/[0.05] rounded-full h-1 overflow-hidden">
                          <div className="h-1 rounded-full bg-emerald-500/40" style={{ width: `${(n.compositeScore / maxNiche) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    {[
                      { v: n.rpmScore,          max: 40 },
                      { v: n.viewsScore,         max: 30 },
                      { v: n.consistencyScore,   max: 20 },
                      { v: n.monetizationScore,  max: 10 },
                    ].map(({ v, max }, ci) => (
                      <td key={ci} className="px-4 py-3">
                        <div className={`text-xs tabular-nums font-medium ${v === max ? "text-emerald-400/80" : v >= max * 0.6 ? "text-white/55" : "text-white/25"}`}>
                          {v}<span className="text-white/15">/{max}</span>
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-white/35 tabular-nums">{n.channelCount}</td>
                    <td className="px-4 py-3 text-white/45 tabular-nums">${n.avgRpm.toFixed(2)}</td>
                    <td className="px-4 py-3 text-white/40 tabular-nums">{fmt(n.avgViewsPerUpload)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

    </div>
  )
}
