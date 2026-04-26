import { supabase } from "./supabase"

// ─── Niche reference tables ───────────────────────────────────────────────────

const NICHE_VALUATION_MULT: Record<string, number> = {
  finance: 2.4, investing: 2.3, crypto: 2.2, business: 2.1,
  tech: 1.9, education: 1.8, fitness: 1.5, gaming: 1.6,
  "lo-fi": 1.3, pop: 1.3, "hip-hop": 1.2, trap: 1.2, "r&b": 1.2,
  ambient: 1.1, classical: 1.1,
}

const NICHE_SPONSOR_PREMIUM: Record<string, number> = {
  finance: 20, investing: 19, business: 18, crypto: 17,
  tech: 16, education: 15, fitness: 13, gaming: 12,
  pop: 11, "lo-fi": 10, "hip-hop": 10, trap: 9, "r&b": 9,
  ambient: 8, classical: 8,
}

const DEFAULT_MULT    = 1.2
const DEFAULT_PREMIUM = 6

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonetizationOverview {
  estMonthlyRevenue: number
  estAnnualRevenue: number
  avgRpm: number
  monetizedChannels: number
  totalChannels: number
  bestNiche: string | null
  topChannel: string | null
}

export type SponsorTier = "none" | "micro" | "mid" | "macro" | "elite"

export interface ChannelRevenueSummary {
  channelId: string
  channelHandle: string | null
  producerSlug: string
  contentNiche: string | null
  monetizationEnabled: boolean
  avgRpm: number
  avgViewsPerUpload: number
  subscriberCount: number
  monthlyViews: number
  uploadCadence: number
  estMonthlyRevenue: number
  estAnnualRevenue: number
  uploadedTotal: number
  uploaded30d: number
}

export interface ProducerEarning {
  producerSlug: string
  channelCount: number
  estMonthlyRevenue: number
  estAnnualRevenue: number
  totalSubscribers: number
  totalMonthlyViews: number
  topChannel: string | null
}

export interface NichePerformance {
  niche: string
  channelCount: number
  avgRpm: number
  avgViewsPerUpload: number
  estMonthlyRevenue: number
}

export interface UnderperformingChannel {
  channelHandle: string | null
  producerSlug: string
  contentNiche: string | null
  avgRpm: number
  avgViewsPerUpload: number
  monthlyViews: number
  uploaded30d: number
  reasons: string[]
}

export interface UploadRecommendation {
  channelHandle: string | null
  producerSlug: string
  contentNiche: string | null
  avgRpm: number
  currentCadence: number
  recommendedCadence: number
  queueDepth: number
  weeklyRevenueGain: number
  reason: string
}

export interface HeatmapWeek {
  weekLabel: string
  weekStart: string
}

export interface HeatmapCell {
  weekIndex: number
  channelHandle: string | null
  estRevenue: number
  uploadCount: number
  tier: 0 | 1 | 2 | 3 | 4
}

export interface SponsorReadiness {
  channelHandle: string | null
  producerSlug: string
  score: number
  tier: SponsorTier
  breakdown: { consistency: number; rpm: number; subscribers: number; nichePremium: number }
}

export interface ChannelValuation {
  channelHandle: string | null
  producerSlug: string
  contentNiche: string | null
  valuationUsd: number
  annualRevenueEst: number
  nicheMultiplier: number
  subscriberCount: number
  monthlyViews: number
}

// ─── Internal row types ───────────────────────────────────────────────────────

interface ChannelRow {
  id: string
  producer_slug: string
  channel_handle: string | null
  upload_cadence: number
  status: string
  monetization_enabled: boolean
  avg_rpm: number
  avg_views_per_upload: number
  subscriber_count: number
  monthly_views: number
  content_niche: string | null
  sponsor_tier: string
}

interface JobRow {
  id: string
  yt_channel_id: string
  status: string
  uploaded_at: string | null
  view_count: number | null
  estimated_revenue_usd: number | null
}

// ─── Shared data fetcher ──────────────────────────────────────────────────────

async function fetchBase(): Promise<{ channels: ChannelRow[]; jobs: JobRow[] }> {
  const [chRes, jobRes] = await Promise.all([
    supabase
      .from("yt_channels")
      .select(
        "id, producer_slug, channel_handle, upload_cadence, status, " +
        "monetization_enabled, avg_rpm, avg_views_per_upload, " +
        "subscriber_count, monthly_views, content_niche, sponsor_tier"
      )
      .order("producer_slug"),
    supabase
      .from("yt_upload_jobs")
      .select("id, yt_channel_id, status, uploaded_at, view_count, estimated_revenue_usd"),
  ])

  return {
    channels: (chRes.data ?? []) as unknown as ChannelRow[],
    jobs:     (jobRes.data ?? []) as unknown as JobRow[],
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estMonthly(ch: ChannelRow): number {
  return (ch.monthly_views / 1000) * ch.avg_rpm
}

function estAnnual(ch: ChannelRow): number {
  return estMonthly(ch) * 12
}

function sponsorScore(
  ch: ChannelRow,
  uploaded30d: number
): { score: number; tier: SponsorTier; breakdown: SponsorReadiness["breakdown"] } {
  const targetMonthly = ch.upload_cadence * 30
  const consistency = Math.round(Math.min(1, targetMonthly > 0 ? uploaded30d / targetMonthly : 0) * 30)
  const rpm         = Math.round(Math.min(1, ch.avg_rpm / 8) * 25)
  const subs        = ch.subscriber_count > 0
    ? Math.round(Math.min(1, Math.log10(ch.subscriber_count + 1) / Math.log10(100_000)) * 25)
    : 0
  const nichePremium = NICHE_SPONSOR_PREMIUM[(ch.content_niche ?? "").toLowerCase()] ?? DEFAULT_PREMIUM
  const score = consistency + rpm + subs + nichePremium

  let tier: SponsorTier = "none"
  if (score >= 80) tier = "elite"
  else if (score >= 60) tier = "macro"
  else if (score >= 40) tier = "mid"
  else if (score >= 20) tier = "micro"

  return { score, tier, breakdown: { consistency, rpm, subscribers: subs, nichePremium } }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getMonetizationOverview(): Promise<MonetizationOverview> {
  const { channels } = await fetchBase()

  const monetized  = channels.filter((c) => c.monetization_enabled)
  const totalRev   = channels.reduce((s, c) => s + estMonthly(c), 0)
  const avgRpm     = monetized.length
    ? monetized.reduce((s, c) => s + c.avg_rpm, 0) / monetized.length
    : 0

  const nicheTotals = new Map<string, number>()
  for (const c of channels) {
    if (!c.content_niche) continue
    nicheTotals.set(c.content_niche, (nicheTotals.get(c.content_niche) ?? 0) + estMonthly(c))
  }
  let bestNiche: string | null = null
  let bestNicheRev = 0
  for (const [n, r] of nicheTotals) {
    if (r > bestNicheRev) { bestNiche = n; bestNicheRev = r }
  }

  const sorted     = [...channels].sort((a, b) => estMonthly(b) - estMonthly(a))
  const topChannel = sorted[0]?.channel_handle ?? null

  return {
    estMonthlyRevenue: totalRev,
    estAnnualRevenue:  totalRev * 12,
    avgRpm,
    monetizedChannels: monetized.length,
    totalChannels:     channels.length,
    bestNiche,
    topChannel,
  }
}

export async function getChannelRevenueSummaries(): Promise<ChannelRevenueSummary[]> {
  const { channels, jobs } = await fetchBase()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  return channels
    .map((ch) => {
      const chJobs     = jobs.filter((j) => j.yt_channel_id === ch.id)
      const uploaded   = chJobs.filter((j) => j.status === "uploaded")
      const uploaded30 = uploaded.filter((j) => j.uploaded_at && j.uploaded_at >= cutoff)
      return {
        channelId:           ch.id,
        channelHandle:       ch.channel_handle,
        producerSlug:        ch.producer_slug,
        contentNiche:        ch.content_niche,
        monetizationEnabled: ch.monetization_enabled,
        avgRpm:              ch.avg_rpm,
        avgViewsPerUpload:   ch.avg_views_per_upload,
        subscriberCount:     ch.subscriber_count,
        monthlyViews:        ch.monthly_views,
        uploadCadence:       ch.upload_cadence,
        estMonthlyRevenue:   estMonthly(ch),
        estAnnualRevenue:    estAnnual(ch),
        uploadedTotal:       uploaded.length,
        uploaded30d:         uploaded30.length,
      } satisfies ChannelRevenueSummary
    })
    .sort((a, b) => b.estMonthlyRevenue - a.estMonthlyRevenue)
}

export async function getProducerEarningsBoard(): Promise<ProducerEarning[]> {
  const { channels } = await fetchBase()

  const byProducer = new Map<string, ChannelRow[]>()
  for (const ch of channels) {
    const list = byProducer.get(ch.producer_slug) ?? []
    list.push(ch)
    byProducer.set(ch.producer_slug, list)
  }

  return [...byProducer.entries()]
    .map(([slug, chs]) => {
      const monthly = chs.reduce((s, c) => s + estMonthly(c), 0)
      const top     = [...chs].sort((a, b) => estMonthly(b) - estMonthly(a))[0]
      return {
        producerSlug:      slug,
        channelCount:      chs.length,
        estMonthlyRevenue: monthly,
        estAnnualRevenue:  monthly * 12,
        totalSubscribers:  chs.reduce((s, c) => s + c.subscriber_count, 0),
        totalMonthlyViews: chs.reduce((s, c) => s + c.monthly_views, 0),
        topChannel:        top?.channel_handle ?? null,
      } satisfies ProducerEarning
    })
    .sort((a, b) => b.estMonthlyRevenue - a.estMonthlyRevenue)
}

export async function getNichePerformance(): Promise<NichePerformance[]> {
  const { channels } = await fetchBase()

  const byNiche = new Map<string, ChannelRow[]>()
  for (const ch of channels) {
    const key = ch.content_niche ?? "uncategorized"
    const list = byNiche.get(key) ?? []
    list.push(ch)
    byNiche.set(key, list)
  }

  return [...byNiche.entries()]
    .map(([niche, chs]) => ({
      niche,
      channelCount:        chs.length,
      avgRpm:              chs.reduce((s, c) => s + c.avg_rpm, 0) / chs.length,
      avgViewsPerUpload:   Math.round(chs.reduce((s, c) => s + c.avg_views_per_upload, 0) / chs.length),
      estMonthlyRevenue:   chs.reduce((s, c) => s + estMonthly(c), 0),
    } satisfies NichePerformance))
    .sort((a, b) => b.avgRpm - a.avgRpm)
}

export async function getUnderperformingChannels(): Promise<UnderperformingChannel[]> {
  const { channels, jobs } = await fetchBase()

  const rpms = channels.map((c) => c.avg_rpm).sort((a, b) => a - b)
  const medianRpm = rpms.length ? rpms[Math.floor(rpms.length / 2)] : 0

  const views = channels.map((c) => c.avg_views_per_upload).sort((a, b) => a - b)
  const medianViews = views.length ? views[Math.floor(views.length / 2)] : 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const result: UnderperformingChannel[] = []

  for (const ch of channels) {
    const uploaded30 = jobs.filter(
      (j) => j.yt_channel_id === ch.id && j.status === "uploaded" && j.uploaded_at && j.uploaded_at >= cutoff
    ).length

    const reasons: string[] = []

    if (ch.avg_rpm < medianRpm * 0.5 && medianRpm > 0)
      reasons.push(`RPM $${ch.avg_rpm.toFixed(2)} — below half the median ($${medianRpm.toFixed(2)})`)

    if (ch.avg_views_per_upload < medianViews * 0.4 && medianViews > 0)
      reasons.push(`${ch.avg_views_per_upload.toLocaleString()} views/upload — well below median`)

    const expectedUploads = ch.upload_cadence * 30
    if (ch.status === "active" && uploaded30 < expectedUploads * 0.4 && expectedUploads > 0)
      reasons.push(`Only ${uploaded30}/${expectedUploads} expected uploads in 30d`)

    if (!ch.monetization_enabled && ch.avg_views_per_upload > 1_000)
      reasons.push("Monetization not enabled despite viewership")

    if (reasons.length > 0) {
      result.push({
        channelHandle:     ch.channel_handle,
        producerSlug:      ch.producer_slug,
        contentNiche:      ch.content_niche,
        avgRpm:            ch.avg_rpm,
        avgViewsPerUpload: ch.avg_views_per_upload,
        monthlyViews:      ch.monthly_views,
        uploaded30d:       uploaded30,
        reasons,
      })
    }
  }

  return result.sort((a, b) => a.avgRpm - b.avgRpm)
}

export async function getUploadRecommendations(): Promise<UploadRecommendation[]> {
  const { channels, jobs } = await fetchBase()

  const rpms = channels.filter((c) => c.avg_rpm > 0).map((c) => c.avg_rpm).sort((a, b) => a - b)
  const medianRpm = rpms.length ? rpms[Math.floor(rpms.length / 2)] : 0

  const result: UploadRecommendation[] = []

  for (const ch of channels) {
    if (!ch.monetization_enabled) continue
    if (ch.avg_rpm < medianRpm) continue

    const queueDepth = jobs.filter(
      (j) => j.yt_channel_id === ch.id && ["pending", "scheduled", "needs_render", "needs_asset"].includes(j.status)
    ).length

    const weekQueue  = ch.upload_cadence * 7
    if (queueDepth >= weekQueue) continue

    const recCadence = Math.min(ch.upload_cadence + 1, 6)
    const gainPerWeek = (recCadence - ch.upload_cadence) * (ch.avg_views_per_upload / 1000) * ch.avg_rpm
    const reason = queueDepth < weekQueue / 2
      ? "Queue running thin on a high-RPM channel"
      : "High-value channel with room for more output"

    result.push({
      channelHandle:     ch.channel_handle,
      producerSlug:      ch.producer_slug,
      contentNiche:      ch.content_niche,
      avgRpm:            ch.avg_rpm,
      currentCadence:    ch.upload_cadence,
      recommendedCadence: recCadence,
      queueDepth,
      weeklyRevenueGain: gainPerWeek,
      reason,
    })
  }

  return result.sort((a, b) => b.weeklyRevenueGain - a.weeklyRevenueGain)
}

export async function getProfitHeatmap(): Promise<{ weeks: HeatmapWeek[]; cells: HeatmapCell[]; channelHandles: (string | null)[] }> {
  const { channels, jobs } = await fetchBase()

  const NUM_WEEKS = 8
  const weeks: HeatmapWeek[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const dayOfWeek = now.getDay()
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))

  for (let w = NUM_WEEKS - 1; w >= 0; w--) {
    const weekStart = new Date(thisMonday)
    weekStart.setDate(thisMonday.getDate() - w * 7)
    weeks.push({
      weekLabel: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weekStart: weekStart.toISOString().slice(0, 10),
    })
  }

  const rpmMap = new Map(channels.map((c) => [c.id, c]))

  const rawCells: { weekIndex: number; channelId: string; estRevenue: number }[] = []

  for (const job of jobs) {
    if (job.status !== "uploaded" || !job.uploaded_at) continue
    const jobDate = job.uploaded_at.slice(0, 10)
    const weekIndex = weeks.findIndex((w, i) => {
      const nextWeek = weeks[i + 1]
      return jobDate >= w.weekStart && (nextWeek === undefined || jobDate < nextWeek.weekStart)
    })
    if (weekIndex === -1) continue
    const ch = rpmMap.get(job.yt_channel_id)
    if (!ch) continue
    const views = job.view_count ?? ch.avg_views_per_upload
    const rev   = (views / 1000) * ch.avg_rpm
    rawCells.push({ weekIndex, channelId: job.yt_channel_id, estRevenue: rev })
  }

  // Aggregate: weekIndex × channelId
  const agg = new Map<string, { estRevenue: number; uploadCount: number }>()
  for (const rc of rawCells) {
    const key = `${rc.weekIndex}:${rc.channelId}`
    const cur = agg.get(key) ?? { estRevenue: 0, uploadCount: 0 }
    cur.estRevenue += rc.estRevenue
    cur.uploadCount += 1
    agg.set(key, cur)
  }

  const maxRev = Math.max(...[...agg.values()].map((v) => v.estRevenue), 0.01)

  const cells: HeatmapCell[] = []
  for (const ch of channels) {
    for (let wi = 0; wi < NUM_WEEKS; wi++) {
      const key = `${wi}:${ch.id}`
      const val = agg.get(key)
      const rev = val?.estRevenue ?? 0
      const cnt = val?.uploadCount ?? 0
      const ratio = rev / maxRev
      const tier = (rev === 0 ? 0 : ratio < 0.2 ? 1 : ratio < 0.45 ? 2 : ratio < 0.75 ? 3 : 4) as HeatmapCell["tier"]
      cells.push({ weekIndex: wi, channelHandle: ch.channel_handle, estRevenue: rev, uploadCount: cnt, tier })
    }
  }

  const channelHandles = channels.map((c) => c.channel_handle)
  return { weeks, cells, channelHandles }
}

export async function getSponsorReadinessScores(): Promise<SponsorReadiness[]> {
  const { channels, jobs } = await fetchBase()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  return channels
    .map((ch) => {
      const uploaded30d = jobs.filter(
        (j) => j.yt_channel_id === ch.id && j.status === "uploaded" && j.uploaded_at && j.uploaded_at >= cutoff
      ).length
      const { score, tier, breakdown } = sponsorScore(ch, uploaded30d)
      return { channelHandle: ch.channel_handle, producerSlug: ch.producer_slug, score, tier, breakdown } satisfies SponsorReadiness
    })
    .sort((a, b) => b.score - a.score)
}

export async function getChannelValuations(): Promise<ChannelValuation[]> {
  const { channels } = await fetchBase()

  return channels
    .map((ch) => {
      const annualRev  = (ch.monthly_views / 1000) * ch.avg_rpm * 12
      const mult       = NICHE_VALUATION_MULT[(ch.content_niche ?? "").toLowerCase()] ?? DEFAULT_MULT
      const valuation  = annualRev * mult * 2.5
      return {
        channelHandle:     ch.channel_handle,
        producerSlug:      ch.producer_slug,
        contentNiche:      ch.content_niche,
        valuationUsd:      valuation,
        annualRevenueEst:  annualRev,
        nicheMultiplier:   mult,
        subscriberCount:   ch.subscriber_count,
        monthlyViews:      ch.monthly_views,
      } satisfies ChannelValuation
    })
    .sort((a, b) => b.valuationUsd - a.valuationUsd)
}
