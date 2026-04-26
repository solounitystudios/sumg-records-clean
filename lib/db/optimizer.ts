import { supabase } from "./supabase"

// ─── Formula constants ────────────────────────────────────────────────────────

// Minimum synced-job data points before A/B analysis is meaningful
const AB_MIN_JOBS = 5

// Industry benchmark scores (music content, UTC) used when real data is sparse
// Day of week: 0=Sun … 6=Sat
const DOW_BENCH: Record<number, number> = { 0: 45, 1: 55, 2: 65, 3: 70, 4: 80, 5: 90, 6: 85 }
// 4-hour blocks: 0=00–04, 1=04–08, 2=08–12, 3=12–16, 4=16–20, 5=20–24
const BLOCK_BENCH: Record<number, number> = { 0: 15, 1: 25, 2: 50, 3: 80, 4: 100, 5: 70 }

const BLOCK_LABELS = ["Midnight–4am", "4am–8am", "8am–Noon", "Noon–4pm", "4pm–8pm", "8pm–Midnight"]
const DAY_LABELS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Median assumed RPM when a channel has no RPM configured (used only for impact estimates on unmonetized channels)
const ASSUMED_RPM = 3.0

function rpu(rpm: number, views: number) { return (rpm * views) / 1_000 }

// ─── Internal DB row types ────────────────────────────────────────────────────

interface ChanRow {
  id:                    string
  producer_slug:         string
  channel_handle:        string | null
  upload_cadence:        number
  status:                string
  monetization_enabled:  boolean
  avg_rpm:               number
  avg_views_per_upload:  number
  subscriber_count:      number
  monthly_views:         number
  content_niche:         string | null
  preferred_genres:      string[]
  stats_last_synced_at:  string | null
  oauth_refresh_token:   string | null
}

interface JobRow {
  id:           string
  yt_channel_id: string | null
  producer_slug: string
  status:        string
  scheduled_at:  string | null
  uploaded_at:   string | null
  view_count:    number | null
  like_count:    number | null
  title:         string | null
  retry_count:   number
}

interface InboxRow {
  producer_slug:    string | null
  ctr_score:        number | null
  quality_score:    number | null
  commercial_score: number | null
  status:           string
}

async function fetchBase() {
  const [chRes, jobRes, inboxRes] = await Promise.all([
    supabase
      .from("yt_channels")
      .select(
        "id, producer_slug, channel_handle, upload_cadence, status, " +
        "monetization_enabled, avg_rpm, avg_views_per_upload, subscriber_count, " +
        "monthly_views, content_niche, preferred_genres, stats_last_synced_at, oauth_refresh_token"
      )
      .order("producer_slug"),
    supabase
      .from("yt_upload_jobs")
      .select("id, yt_channel_id, producer_slug, status, scheduled_at, uploaded_at, view_count, like_count, title, retry_count"),
    supabase
      .from("audio_inbox")
      .select("producer_slug, ctr_score, quality_score, commercial_score, status"),
  ])
  return {
    channels: (chRes.data  ?? []) as unknown as ChanRow[],
    jobs:     (jobRes.data ?? []) as unknown as JobRow[],
    inbox:    (inboxRes.data ?? []) as unknown as InboxRow[],
  }
}

// ─── Exported types ───────────────────────────────────────────────────────────

export interface ProducerOpportunity {
  channelHandle:   string | null
  producerSlug:    string
  contentNiche:    string | null
  revPerUpload:    number   // $ per video
  uploadedLast28d: number
  capacityLast28d: number   // cadence × 28
  gapUploads:      number   // missed uploads
  opportunityUsd:  number   // gap × revPerUpload
  score:           number   // 0–100
  queueDepth:      number
}

export interface TimeCell {
  dow:       number   // 0=Sun…6=Sat
  block:     number   // 0–5
  label:     string   // "Fri · 4pm–8pm"
  avgViews:  number
  score:     number   // 0–100
  dataPoints: number
  isReal:    boolean  // true = from actual data, false = benchmark
}

export interface UploadTimeData {
  cells:        TimeCell[]
  topSlots:     TimeCell[]  // top 3 by score
  hasRealData:  boolean
}

export interface NicheWinner {
  niche:             string
  channelCount:      number
  avgRpm:            number
  avgViewsPerUpload: number
  consistency:       number  // 0–1 ratio: uploaded_30d / expected
  monetizationRate:  number  // fraction of channels with monetization_enabled
  compositeScore:    number  // 0–100
  rpmScore:          number
  viewsScore:        number
  consistencyScore:  number
  monetizationScore: number
}

export interface CadenceSuggestion {
  channelHandle:    string | null
  producerSlug:     string
  contentNiche:     string | null
  currentCadence:   number
  optimalCadence:   number
  action:           "increase" | "maintain" | "reduce"
  revPerUpload:     number
  weeklyRevDelta:   number   // $ change per week if suggestion is followed
  reason:           string
}

export interface DeadChannelAlert {
  channelHandle:   string | null
  producerSlug:    string
  contentNiche:    string | null
  silenceDays:     number
  threshold:       number
  urgency:         "critical" | "high" | "medium"
  diagnosis:       string
  recoveryAction:  string
  recoveryHref:    string
  revPerUpload:    number
}

export interface ABRecommendation {
  channelHandle:   string | null
  producerSlug:    string
  type:            "variance_pattern" | "high_ctr_queued" | "needs_data"
  insight:         string
  detail:          string
  syncedJobs:      number
  requiredJobs:    number
}

export type GrowthActionType =
  | "connect_oauth"
  | "sync_analytics"
  | "clear_bottleneck"
  | "fill_queue"
  | "increase_cadence"
  | "enable_monetization"
  | "recover_channel"

export interface GrowthAction {
  id:            string
  type:          GrowthActionType
  urgency:       "critical" | "high" | "medium"
  channelHandle: string | null
  producerSlug:  string
  impactUsd:     number   // estimated monthly revenue impact
  title:         string
  reason:        string
  cta:           string
  href:          string
}

export interface OptimizerData {
  opportunityBoard:      ProducerOpportunity[]
  uploadTimeEngine:      UploadTimeData
  nicheMatrix:           NicheWinner[]
  cadenceSuggestions:    CadenceSuggestion[]
  deadChannels:          DeadChannelAlert[]
  abRecommendations:     ABRecommendation[]
  growthQueue:           GrowthAction[]
  // Summary KPIs
  totalRevenueAtRisk:    number
  channelsNeedingAction: number
  topOpportunityUsd:     number
  actionsFound:          number
}

// ─── Module: Producer Opportunity Board ──────────────────────────────────────
// Formula:
//   rev_per_upload  = avg_rpm × avg_views_per_upload / 1000
//   capacity_gap    = max(0, upload_cadence × 28 − uploaded_last_28_days)
//   opportunity_usd = rev_per_upload × capacity_gap
//   score           = min(100, round(opportunity_usd / 5))  ← $500 gap → score 100

function buildOpportunityBoard(channels: ChanRow[], jobs: JobRow[]): ProducerOpportunity[] {
  const now = Date.now()
  const ago28 = new Date(now - 28 * 86_400_000).toISOString()

  return channels
    .filter((ch) => ch.status === "active")
    .map((ch) => {
      const chJobs   = jobs.filter((j) => j.yt_channel_id === ch.id)
      const uploaded = chJobs.filter(
        (j) => j.status === "uploaded" && j.uploaded_at && j.uploaded_at >= ago28
      ).length
      const queueDepth = chJobs.filter((j) =>
        ["pending", "scheduled", "needs_render", "needs_asset"].includes(j.status)
      ).length

      const capacity   = ch.upload_cadence * 28
      const gap        = Math.max(0, capacity - uploaded)
      const rev        = rpu(ch.avg_rpm, ch.avg_views_per_upload)
      const opUsd      = rev * gap
      const score      = Math.min(100, Math.round(opUsd / 5))

      return {
        channelHandle:   ch.channel_handle,
        producerSlug:    ch.producer_slug,
        contentNiche:    ch.content_niche,
        revPerUpload:    rev,
        uploadedLast28d: uploaded,
        capacityLast28d: capacity,
        gapUploads:      gap,
        opportunityUsd:  opUsd,
        score,
        queueDepth,
      } satisfies ProducerOpportunity
    })
    .sort((a, b) => b.opportunityUsd - a.opportunityUsd)
}

// ─── Module: Best Upload Time Engine ─────────────────────────────────────────
// Formula (when real data exists):
//   bucket_key = `${dayOfWeek}:${floor(hour/4)}`
//   avg_views  = mean(view_count) for jobs in bucket  [min 3 data points]
//   score      = avg_views / max_avg_views × 100
//
// Benchmark (insufficient data):
//   score = DOW_BENCH[dow] × BLOCK_BENCH[block] / 100

function buildUploadTimeEngine(jobs: JobRow[]): UploadTimeData {
  const syncedJobs = jobs.filter(
    (j) => j.status === "uploaded" && j.view_count != null &&
           (j.uploaded_at ?? j.scheduled_at)
  )

  const buckets = new Map<string, number[]>()

  for (const j of syncedJobs) {
    const ts  = j.uploaded_at ?? j.scheduled_at
    if (!ts) continue
    const dt  = new Date(ts)
    const dow   = dt.getUTCDay()
    const block = Math.floor(dt.getUTCHours() / 4)
    const key   = `${dow}:${block}`
    const arr   = buckets.get(key) ?? []
    arr.push(j.view_count!)
    buckets.set(key, arr)
  }

  const hasRealData = [...buckets.values()].some((v) => v.length >= 3)

  // Build cells for all 7×6 = 42 slots
  const rawCells: { dow: number; block: number; avg: number; n: number; isReal: boolean }[] = []

  for (let dow = 0; dow < 7; dow++) {
    for (let block = 0; block < 6; block++) {
      const key    = `${dow}:${block}`
      const vals   = buckets.get(key) ?? []
      const isReal = vals.length >= 3

      if (isReal) {
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length
        rawCells.push({ dow, block, avg, n: vals.length, isReal: true })
      } else {
        // Benchmark: normalize to a synthetic avg-view count so scores are comparable
        const benchScore = (DOW_BENCH[dow] * BLOCK_BENCH[block]) / 100
        rawCells.push({ dow, block, avg: benchScore, n: vals.length, isReal: false })
      }
    }
  }

  const maxAvg = Math.max(...rawCells.map((c) => c.avg), 1)

  const cells: TimeCell[] = rawCells.map(({ dow, block, avg, n, isReal }) => ({
    dow,
    block,
    label:      `${DAY_LABELS[dow]} · ${BLOCK_LABELS[block]}`,
    avgViews:   isReal ? Math.round(avg) : 0,
    score:      Math.round((avg / maxAvg) * 100),
    dataPoints: n,
    isReal,
  }))

  const topSlots = [...cells].sort((a, b) => b.score - a.score).slice(0, 3)
  return { cells, topSlots, hasRealData }
}

// ─── Module: Niche Winner Matrix ──────────────────────────────────────────────
// Composite score (0–100):
//   rpm_score          = (avg_rpm / max_rpm) × 40
//   views_score        = (avg_views / max_views) × 30
//   consistency_score  = (uploaded_30d / expected_30d) × 20    [capped at 1]
//   monetization_score = (monetized_count / total_count) × 10
//   composite          = sum of above

function buildNicheMatrix(channels: ChanRow[], jobs: JobRow[]): NicheWinner[] {
  const ago30 = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const byNiche = new Map<string, ChanRow[]>()
  for (const ch of channels) {
    const key = ch.content_niche ?? "uncategorized"
    const arr  = byNiche.get(key) ?? []
    arr.push(ch)
    byNiche.set(key, arr)
  }

  const raw: Omit<NicheWinner, "rpmScore" | "viewsScore" | "consistencyScore" | "monetizationScore" | "compositeScore">[] = []

  for (const [niche, chs] of byNiche) {
    const avg_rpm   = chs.reduce((s, c) => s + c.avg_rpm, 0) / chs.length
    const avg_views = chs.reduce((s, c) => s + c.avg_views_per_upload, 0) / chs.length

    let uploaded30  = 0
    let expected30  = 0
    for (const ch of chs) {
      uploaded30 += jobs.filter(
        (j) => j.yt_channel_id === ch.id && j.status === "uploaded" && j.uploaded_at && j.uploaded_at >= ago30
      ).length
      expected30 += ch.upload_cadence * 30
    }
    const consistency       = expected30 > 0 ? Math.min(1, uploaded30 / expected30) : 0
    const monetizationRate  = chs.filter((c) => c.monetization_enabled).length / chs.length

    raw.push({ niche, channelCount: chs.length, avgRpm: avg_rpm, avgViewsPerUpload: avg_views, consistency, monetizationRate })
  }

  const maxRpm   = Math.max(...raw.map((r) => r.avgRpm),   0.01)
  const maxViews = Math.max(...raw.map((r) => r.avgViewsPerUpload), 1)

  return raw
    .map((r) => {
      const rpmScore          = Math.round((r.avgRpm   / maxRpm)   * 40)
      const viewsScore        = Math.round((r.avgViewsPerUpload / maxViews) * 30)
      const consistencyScore  = Math.round(r.consistency       * 20)
      const monetizationScore = Math.round(r.monetizationRate  * 10)
      return {
        ...r,
        rpmScore,
        viewsScore,
        consistencyScore,
        monetizationScore,
        compositeScore: rpmScore + viewsScore + consistencyScore + monetizationScore,
      } satisfies NicheWinner
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
}

// ─── Module: Auto Cadence Suggestions ────────────────────────────────────────
// Formula:
//   rev_per_upload  = avg_rpm × avg_views_per_upload / 1000
//   optimal_cadence:
//     rev ≥ $4.00 → min(ceil(cadence × 1.5), 7)   — scale up
//     rev ≥ $1.50 → cadence                        — maintain
//     rev <  $1.50 → max(1, cadence − 1)           — reduce, improve quality first
//   weekly_delta = (optimal − current) × 7 × rev_per_upload

function buildCadenceSuggestions(channels: ChanRow[]): CadenceSuggestion[] {
  return channels
    .filter((ch) => ch.status === "active")
    .map((ch) => {
      const rev     = rpu(ch.avg_rpm, ch.avg_views_per_upload)
      let optimal   = ch.upload_cadence
      let action:   CadenceSuggestion["action"] = "maintain"
      let reason    = ""

      if (rev >= 4.0) {
        optimal = Math.min(Math.ceil(ch.upload_cadence * 1.5), 7)
        action  = optimal > ch.upload_cadence ? "increase" : "maintain"
        reason  = `At $${rev.toFixed(2)}/upload, each extra daily video adds ${((optimal - ch.upload_cadence) * 7 * rev).toFixed(0)} to weekly revenue.`
      } else if (rev >= 1.5) {
        action = "maintain"
        reason = "Revenue per upload is solid — hold cadence and focus on quality."
      } else {
        optimal = Math.max(1, ch.upload_cadence - 1)
        action  = optimal < ch.upload_cadence ? "reduce" : "maintain"
        reason  = rev === 0
          ? "RPM and views are unset — configure monetization data to unlock cadence guidance."
          : `At $${rev.toFixed(2)}/upload, focus on improving asset quality before scaling volume.`
      }

      return {
        channelHandle:  ch.channel_handle,
        producerSlug:   ch.producer_slug,
        contentNiche:   ch.content_niche,
        currentCadence: ch.upload_cadence,
        optimalCadence: optimal,
        action,
        revPerUpload:   rev,
        weeklyRevDelta: (optimal - ch.upload_cadence) * 7 * rev,
        reason,
      } satisfies CadenceSuggestion
    })
    .sort((a, b) => Math.abs(b.weeklyRevDelta) - Math.abs(a.weeklyRevDelta))
}

// ─── Module: Dead Channel Recovery Alerts ────────────────────────────────────
// Formula:
//   threshold_days  = max(7, round(SILENCE_BASE_DAYS / upload_cadence))
//   silence_days    = days since last uploaded job
//   flagged if silence_days > threshold_days OR (active + 0 uploads in 30d + empty queue)
//   urgency: critical = no oauth OR silence > 2×threshold; high = silence > threshold; medium = borderline

function buildDeadChannels(channels: ChanRow[], jobs: JobRow[]): DeadChannelAlert[] {
  const now   = Date.now()
  const ago30 = new Date(now - 30 * 86_400_000).toISOString()
  const alerts: DeadChannelAlert[] = []

  for (const ch of channels) {
    if (ch.status !== "active") continue

    const chJobs    = jobs.filter((j) => j.yt_channel_id === ch.id)
    const uploaded  = chJobs.filter((j) => j.status === "uploaded").sort(
      (a, b) => (b.uploaded_at ?? "").localeCompare(a.uploaded_at ?? "")
    )
    const uploaded30 = chJobs.filter((j) => j.status === "uploaded" && j.uploaded_at && j.uploaded_at >= ago30).length
    const queueDepth = chJobs.filter((j) => ["pending", "scheduled", "needs_render", "needs_asset"].includes(j.status)).length
    const failedJobs = chJobs.filter((j) => j.status === "failed").length
    const needsRender = chJobs.filter((j) => j.status === "needs_render").length

    const lastUploadAt = uploaded[0]?.uploaded_at ?? null
    const silenceDays  = lastUploadAt
      ? Math.floor((now - new Date(lastUploadAt).getTime()) / 86_400_000)
      : 999

    const threshold = Math.max(7, Math.round(14 / Math.max(1, ch.upload_cadence)))
    const isSilent  = silenceDays > threshold

    // Also flag: active channel with no uploads in 30d and empty queue
    const isStalled = uploaded30 === 0 && queueDepth === 0

    if (!isSilent && !isStalled) continue

    const noOauth  = !ch.oauth_refresh_token
    const urgency: DeadChannelAlert["urgency"] =
      noOauth || silenceDays > threshold * 2 ? "critical" :
      silenceDays > threshold                ? "high"     : "medium"

    let diagnosis     = ""
    let recoveryAction = ""
    let recoveryHref  = "/admin/youtube/jobs"

    if (noOauth) {
      diagnosis      = "Channel is not connected via OAuth — uploads are blocked."
      recoveryAction = "Connect OAuth credentials in the engine."
      recoveryHref   = "/admin/youtube/engine"
    } else if (failedJobs > 3) {
      diagnosis      = `${failedJobs} failed jobs accumulating — repeated failures blocking the queue.`
      recoveryAction = "Review failed jobs and fix the root cause."
      recoveryHref   = "/admin/youtube/jobs"
    } else if (needsRender > 0 && queueDepth === 0) {
      diagnosis      = `${needsRender} jobs stuck in needs_render — render pipeline is blocked.`
      recoveryAction = "Trigger render for pending jobs."
      recoveryHref   = "/admin/youtube/render"
    } else if (queueDepth === 0) {
      diagnosis      = "Queue is empty — no content is staged for this channel."
      recoveryAction = "Add tracks to the audio inbox and route them to this channel."
      recoveryHref   = "/admin/youtube/inbox"
    } else {
      diagnosis      = `${queueDepth} jobs are queued but nothing has uploaded in ${silenceDays}d.`
      recoveryAction = "Check for scheduler or processor issues."
      recoveryHref   = "/admin/youtube/engine"
    }

    alerts.push({
      channelHandle:  ch.channel_handle,
      producerSlug:   ch.producer_slug,
      contentNiche:   ch.content_niche,
      silenceDays:    silenceDays === 999 ? -1 : silenceDays,
      threshold,
      urgency,
      diagnosis,
      recoveryAction,
      recoveryHref,
      revPerUpload:   rpu(ch.avg_rpm, ch.avg_views_per_upload),
    })
  }

  const urgencyOrder = { critical: 0, high: 1, medium: 2 }
  return alerts.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
}

// ─── Module: A/B Test Recommendations ────────────────────────────────────────
// Formula:
//   synced_jobs = uploaded jobs with view_count on this channel
//   if synced_jobs < AB_MIN_JOBS → "needs_data"
//   else:
//     mean  = mean(view_count)
//     std   = std_dev(view_count)
//     CoV   = std / mean                    [coefficient of variation]
//     if CoV > 0.5 → "variance_pattern"
//       best_job  = job with max view_count
//       detail    = title length / format of best vs worst
//     check inbox for producer: if any item has ctr_score > 75 → "high_ctr_queued"

function buildABRecommendations(channels: ChanRow[], jobs: JobRow[], inbox: InboxRow[]): ABRecommendation[] {
  const recs: ABRecommendation[] = []

  for (const ch of channels) {
    const syncedJobs = jobs.filter(
      (j) => j.yt_channel_id === ch.id && j.status === "uploaded" && j.view_count != null
    )
    const n = syncedJobs.length

    // High-CTR content waiting in inbox for this producer
    const highCtrItems = inbox.filter(
      (i) => i.producer_slug === ch.producer_slug &&
             (i.status === "needs_metadata" || i.status === "needs_thumbnail" || i.status === "ready_to_schedule") &&
             (i.ctr_score ?? 0) >= 75
    )
    if (highCtrItems.length > 0) {
      const avgCtr = Math.round(
        highCtrItems.reduce((s, i) => s + (i.ctr_score ?? 0), 0) / highCtrItems.length
      )
      recs.push({
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        type:          "high_ctr_queued",
        insight:       `${highCtrItems.length} high-CTR track${highCtrItems.length > 1 ? "s" : ""} ready to schedule`,
        detail:        `Avg CTR score: ${avgCtr}/100. These tracks are predicted to outperform — prioritize routing to this channel.`,
        syncedJobs:    n,
        requiredJobs:  AB_MIN_JOBS,
      })
    }

    if (n < AB_MIN_JOBS) {
      recs.push({
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        type:          "needs_data",
        insight:       `${n}/${AB_MIN_JOBS} synced uploads`,
        detail:        `Need ${AB_MIN_JOBS - n} more uploads with analytics sync before title/content pattern analysis is meaningful.`,
        syncedJobs:    n,
        requiredJobs:  AB_MIN_JOBS,
      })
      continue
    }

    const views = syncedJobs.map((j) => j.view_count!)
    const mean  = views.reduce((s, v) => s + v, 0) / views.length
    const std   = Math.sqrt(views.reduce((s, v) => s + (v - mean) ** 2, 0) / views.length)
    const cov   = mean > 0 ? std / mean : 0

    if (cov > 0.5) {
      const best  = syncedJobs.reduce((a, b) => (b.view_count! > a.view_count! ? b : a))
      const worst = syncedJobs.reduce((a, b) => (b.view_count! < a.view_count! ? b : a))
      const bestLen  = best.title?.length  ?? 0
      const worstLen = worst.title?.length ?? 0
      const lenHint  = bestLen > 0
        ? bestLen < worstLen
          ? `shorter titles (best: "${best.title?.slice(0, 40)}…" at ${bestLen} chars)`
          : `longer titles (best: "${best.title?.slice(0, 40)}…" at ${bestLen} chars)`
        : "title format"

      recs.push({
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        type:          "variance_pattern",
        insight:       `High view variance (CoV ${cov.toFixed(2)}) — ${fmt(Math.round(best.view_count!))} vs ${fmt(Math.round(worst.view_count!))} views`,
        detail:        `Top performer favours ${lenHint}. Test this format consistently across the next 5 uploads. Mean: ${fmt(Math.round(mean))} views.`,
        syncedJobs:    n,
        requiredJobs:  AB_MIN_JOBS,
      })
    }
  }

  return recs.sort((a, b) => {
    const ord = { variance_pattern: 0, high_ctr_queued: 1, needs_data: 2 }
    return ord[a.type] - ord[b.type]
  })
}

// ─── Module: Growth Priority Queue ───────────────────────────────────────────
// Actions ranked by estimated monthly revenue impact.
// Impact formulas:
//   connect_oauth      : cadence × 30 × rev_per_upload   (can't upload at all)
//   sync_analytics     : monthly_views × avg_rpm / 1000  (blind on this revenue)
//   clear_bottleneck   : stuck_jobs × rev_per_upload × (30 / cadence)
//   fill_queue         : gap_uploads × rev_per_upload
//   increase_cadence   : weekly_delta × 4
//   enable_monetization: monthly_views × ASSUMED_RPM / 1000
//   recover_channel    : cadence × 30 × rev_per_upload

function buildGrowthQueue(
  channels: ChanRow[],
  jobs: JobRow[],
  opportunity: ProducerOpportunity[],
  cadence: CadenceSuggestion[],
  dead: DeadChannelAlert[],
): GrowthAction[] {
  const actions: GrowthAction[] = []
  const now   = Date.now()
  const ago30 = new Date(now - 30 * 86_400_000).toISOString()

  for (const ch of channels) {
    const rev   = rpu(ch.avg_rpm, ch.avg_views_per_upload)
    const chJobs = jobs.filter((j) => j.yt_channel_id === ch.id)

    // connect_oauth
    if (!ch.oauth_refresh_token && ch.status === "active") {
      actions.push({
        id:            `oauth-${ch.id}`,
        type:          "connect_oauth",
        urgency:       "critical",
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        impactUsd:     ch.upload_cadence * 30 * rev,
        title:         `Connect OAuth: ${ch.channel_handle ?? ch.producer_slug}`,
        reason:        "Channel is active but OAuth credentials are missing — no uploads possible.",
        cta:           "Connect →",
        href:          "/admin/youtube/engine",
      })
    }

    // sync_analytics
    if (!ch.stats_last_synced_at && ch.monthly_views > 0) {
      actions.push({
        id:            `sync-${ch.id}`,
        type:          "sync_analytics",
        urgency:       "high",
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        impactUsd:     (ch.monthly_views * ch.avg_rpm) / 1_000,
        title:         `Sync analytics: ${ch.channel_handle ?? ch.producer_slug}`,
        reason:        "No analytics sync has run — subscriber count and monthly views may be stale.",
        cta:           "Run cron →",
        href:          "/admin/youtube/engine",
      })
    }

    // clear_bottleneck
    const stuckRender = chJobs.filter((j) => j.status === "needs_render").length
    const stuckAsset  = chJobs.filter((j) => j.status === "needs_asset").length
    if (stuckRender > 0) {
      actions.push({
        id:            `render-${ch.id}`,
        type:          "clear_bottleneck",
        urgency:       stuckRender >= 3 ? "high" : "medium",
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        impactUsd:     stuckRender * rev * (30 / Math.max(1, ch.upload_cadence)),
        title:         `Render ${stuckRender} job${stuckRender > 1 ? "s" : ""}: ${ch.channel_handle ?? ch.producer_slug}`,
        reason:        `${stuckRender} job${stuckRender > 1 ? "s are" : " is"} stuck in needs_render, blocking the queue.`,
        cta:           "Render →",
        href:          "/admin/youtube/render",
      })
    }
    if (stuckAsset > 0) {
      actions.push({
        id:            `asset-${ch.id}`,
        type:          "clear_bottleneck",
        urgency:       "medium",
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        impactUsd:     stuckAsset * rev * (30 / Math.max(1, ch.upload_cadence)),
        title:         `Assign assets: ${ch.channel_handle ?? ch.producer_slug}`,
        reason:        `${stuckAsset} job${stuckAsset > 1 ? "s need" : " needs"} an asset assigned before they can proceed.`,
        cta:           "Assign →",
        href:          "/admin/youtube/queue",
      })
    }

    // fill_queue (from opportunity board)
    const opp = opportunity.find((o) => o.channelHandle === ch.channel_handle && o.producerSlug === ch.producer_slug)
    if (opp && opp.gapUploads >= 7 && opp.opportunityUsd > 0) {
      actions.push({
        id:            `fill-${ch.id}`,
        type:          "fill_queue",
        urgency:       opp.gapUploads >= ch.upload_cadence * 14 ? "high" : "medium",
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        impactUsd:     opp.opportunityUsd,
        title:         `Fill queue: ${ch.channel_handle ?? ch.producer_slug}`,
        reason:        `${opp.gapUploads} uploads missed in the last 4 weeks at ${usd(rev)}/upload.`,
        cta:           "Add content →",
        href:          "/admin/youtube/inbox",
      })
    }

    // increase_cadence
    const cad = cadence.find((c) => c.producerSlug === ch.producer_slug && c.channelHandle === ch.channel_handle)
    if (cad && cad.action === "increase" && cad.weeklyRevDelta > 5) {
      actions.push({
        id:            `cadence-${ch.id}`,
        type:          "increase_cadence",
        urgency:       "medium",
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        impactUsd:     cad.weeklyRevDelta * 4,
        title:         `Increase cadence: ${ch.channel_handle ?? ch.producer_slug}`,
        reason:        `${cad.currentCadence}→${cad.optimalCadence}/day adds ${usd(cad.weeklyRevDelta)}/week.`,
        cta:           "Edit channel →",
        href:          "/admin/youtube/channels",
      })
    }

    // enable_monetization
    if (!ch.monetization_enabled && ch.monthly_views > 500) {
      actions.push({
        id:            `monetize-${ch.id}`,
        type:          "enable_monetization",
        urgency:       ch.monthly_views > 5_000 ? "high" : "medium",
        channelHandle: ch.channel_handle,
        producerSlug:  ch.producer_slug,
        impactUsd:     (ch.monthly_views * ASSUMED_RPM) / 1_000,
        title:         `Enable monetization: ${ch.channel_handle ?? ch.producer_slug}`,
        reason:        `${fmt(ch.monthly_views)} monthly views with monetization off — est. ${usd((ch.monthly_views * ASSUMED_RPM) / 1_000)}/mo unrealised.`,
        cta:           "Configure →",
        href:          "/admin/youtube/monetization",
      })
    }
  }

  // recover_channel (from dead alerts)
  for (const d of dead) {
    if (!actions.find((a) => a.type === "connect_oauth" && a.producerSlug === d.producerSlug)) {
      actions.push({
        id:            `recover-${d.producerSlug}-${d.channelHandle}`,
        type:          "recover_channel",
        urgency:       d.urgency,
        channelHandle: d.channelHandle,
        producerSlug:  d.producerSlug,
        impactUsd:     d.revPerUpload * (d.silenceDays > 0 ? Math.min(d.silenceDays, 30) : 7),
        title:         `Recover: ${d.channelHandle ?? d.producerSlug}`,
        reason:        d.diagnosis,
        cta:           "Fix →",
        href:          d.recoveryHref,
      })
    }
  }

  // Deduplicate by id, sort: urgency first, then impactUsd desc
  const urgOrder = { critical: 0, high: 1, medium: 2 }
  const seen = new Set<string>()
  return actions
    .filter((a) => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
    .sort((a, b) => {
      const uDiff = urgOrder[a.urgency] - urgOrder[b.urgency]
      return uDiff !== 0 ? uDiff : b.impactUsd - a.impactUsd
    })
    .slice(0, 12)
}

// ─── Formatting helpers (used inside this file) ───────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function getOptimizerData(): Promise<OptimizerData> {
  const { channels, jobs, inbox } = await fetchBase()

  const opportunityBoard   = buildOpportunityBoard(channels, jobs)
  const uploadTimeEngine   = buildUploadTimeEngine(jobs)
  const nicheMatrix        = buildNicheMatrix(channels, jobs)
  const cadenceSuggestions = buildCadenceSuggestions(channels)
  const deadChannels       = buildDeadChannels(channels, jobs)
  const abRecommendations  = buildABRecommendations(channels, jobs, inbox)
  const growthQueue        = buildGrowthQueue(channels, jobs, opportunityBoard, cadenceSuggestions, deadChannels)

  const totalRevenueAtRisk    = growthQueue.reduce((s, a) => s + a.impactUsd, 0)
  const channelsNeedingAction = new Set(growthQueue.map((a) => a.channelHandle ?? a.producerSlug)).size
  const topOpportunityUsd     = opportunityBoard[0]?.opportunityUsd ?? 0
  const actionsFound          = growthQueue.length

  return {
    opportunityBoard,
    uploadTimeEngine,
    nicheMatrix,
    cadenceSuggestions,
    deadChannels,
    abRecommendations,
    growthQueue,
    totalRevenueAtRisk,
    channelsNeedingAction,
    topOpportunityUsd,
    actionsFound,
  }
}
