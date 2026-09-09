import { supabase } from "./supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TodaySummary {
  uploadedToday: number
  scheduledToday: number
  queueDepth: number
  failedTotal: number
  needsAsset: number
  needsRender: number
}

export interface CalendarJob {
  id: string
  title: string | null
  producerSlug: string
  channelHandle: string | null
  scheduledAt: string
  status: string
  dnaPackId: string | null
}

export interface CalendarDay {
  date: string // YYYY-MM-DD
  jobs: CalendarJob[]
}

export type ProducerHealthLabel = "healthy" | "low_queue" | "blocked" | "disconnected" | "failing"

export interface ProducerHealth {
  producerSlug: string
  channelId: string
  channelHandle: string | null
  channelStatus: string
  oauthConnected: boolean
  uploadCadence: number
  uploadedToday: number
  scheduledNext7Days: number
  readyJobs: number
  needsRender: number
  failedJobs: number
  queueDepth: number
  healthLabel: ProducerHealthLabel
}

export interface SystemHealth {
  totalChannels: number
  oauthChannels: number
  activeChannels: number
  failedJobs: number
  needsAsset: number
  needsRender: number
  pendingScheduled: number
  processing: number
  uploaded: number
}

export interface FailedJob {
  id: string
  producerSlug: string
  title: string | null
  channelHandle: string | null
  errorMessage: string | null
  retryCount: number
  updatedAt: string
}

export interface BottleneckJob {
  id: string
  producerSlug: string
  title: string | null
  status: string
  channelHandle: string | null
  createdAt: string
}

export interface AppleMusicEntityHealth {
  total: number
  linked: number
  missing: number
}

export interface AppleMusicSyncHealth {
  artists: AppleMusicEntityHealth
  releases: AppleMusicEntityHealth
  songs: AppleMusicEntityHealth
  hasLastSynced: false
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getTodaySummary(): Promise<TodaySummary> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const nowIso = new Date().toISOString()

  const [uploadedRes, scheduledRes, queueRes, failedRes, needsAssetRes, needsRenderRes] =
    await Promise.all([
      supabase
        .from("yt_upload_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "uploaded")
        .gte("uploaded_at", todayStart.toISOString())
        .lte("uploaded_at", todayEnd.toISOString()),

      supabase
        .from("yt_upload_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled")
        .gte("scheduled_at", nowIso),

      supabase
        .from("yt_upload_jobs")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "scheduled", "needs_render", "needs_asset"]),

      supabase
        .from("yt_upload_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed"),

      supabase
        .from("yt_upload_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "needs_asset"),

      supabase
        .from("yt_upload_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "needs_render"),
    ])

  return {
    uploadedToday:  uploadedRes.count   ?? 0,
    scheduledToday: scheduledRes.count  ?? 0,
    queueDepth:     queueRes.count      ?? 0,
    failedTotal:    failedRes.count     ?? 0,
    needsAsset:     needsAssetRes.count ?? 0,
    needsRender:    needsRenderRes.count ?? 0,
  }
}

export async function get30DayCalendar(): Promise<CalendarDay[]> {
  const now = new Date()
  const rangeStart = new Date()
  rangeStart.setDate(now.getDate() - 2)
  rangeStart.setHours(0, 0, 0, 0)
  const rangeEnd = new Date()
  rangeEnd.setDate(now.getDate() + 28)
  rangeEnd.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("id, title, producer_slug, yt_channels(channel_handle), scheduled_at, status, dna_pack_id")
    .in("status", ["scheduled", "pending", "uploaded"])
    .not("scheduled_at", "is", null)
    .gte("scheduled_at", rangeStart.toISOString())
    .lte("scheduled_at", rangeEnd.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(500)

  if (error) return []

  const dayMap = new Map<string, CalendarJob[]>()

  for (const r of data ?? []) {
    if (!r.scheduled_at) continue
    const date = r.scheduled_at.slice(0, 10)
    const job: CalendarJob = {
      id:            r.id,
      title:         r.title ?? null,
      producerSlug:  r.producer_slug,
      channelHandle: (r.yt_channels as any)?.channel_handle ?? null,
      scheduledAt:   r.scheduled_at,
      status:        r.status,
      dnaPackId:     r.dna_pack_id ?? null,
    }
    const list = dayMap.get(date) ?? []
    list.push(job)
    dayMap.set(date, list)
  }

  const days: CalendarDay[] = []
  const cursor = new Date(rangeStart)
  while (cursor <= rangeEnd) {
    const dateStr = cursor.toISOString().slice(0, 10)
    days.push({ date: dateStr, jobs: dayMap.get(dateStr) ?? [] })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export async function getProducerHealth(): Promise<ProducerHealth[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sevenDaysOut = new Date()
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
  const nowIso = new Date().toISOString()

  const { data: channels, error } = await supabase
    .from("yt_channels")
    .select("id, producer_slug, channel_id, channel_handle, status, upload_cadence, oauth_refresh_token")
    .order("producer_slug", { ascending: true })

  if (error || !channels) return []

  const { data: jobs } = await supabase
    .from("yt_upload_jobs")
    .select("id, producer_slug, yt_channel_id, status, scheduled_at, uploaded_at")
    .in("status", ["pending", "scheduled", "needs_render", "needs_asset", "uploaded", "failed"])

  const jobList = jobs ?? []

  return channels.map((ch) => {
    const chJobs = jobList.filter((j) => j.yt_channel_id === ch.id)

    const uploadedToday = chJobs.filter(
      (j) => j.status === "uploaded" && j.uploaded_at && j.uploaded_at >= todayStart.toISOString()
    ).length

    const scheduledNext7Days = chJobs.filter(
      (j) =>
        j.status === "scheduled" &&
        j.scheduled_at &&
        j.scheduled_at >= nowIso &&
        j.scheduled_at <= sevenDaysOut.toISOString()
    ).length

    const readyJobs   = chJobs.filter((j) => j.status === "pending" || j.status === "scheduled").length
    const needsRender = chJobs.filter((j) => j.status === "needs_render").length
    const failedJobs  = chJobs.filter((j) => j.status === "failed").length
    const queueDepth  = chJobs.filter((j) =>
      ["pending", "scheduled", "needs_render", "needs_asset"].includes(j.status)
    ).length

    const oauthConnected = !!ch.oauth_refresh_token

    let healthLabel: ProducerHealthLabel = "healthy"
    if (!oauthConnected) {
      healthLabel = "disconnected"
    } else if (failedJobs > 0) {
      healthLabel = "failing"
    } else if (needsRender > 0 && readyJobs === 0) {
      healthLabel = "blocked"
    } else if (queueDepth < 3) {
      healthLabel = "low_queue"
    }

    return {
      producerSlug:      ch.producer_slug,
      channelId:         ch.channel_id,
      channelHandle:     ch.channel_handle ?? null,
      channelStatus:     ch.status ?? "active",
      oauthConnected,
      uploadCadence:     ch.upload_cadence ?? 3,
      uploadedToday,
      scheduledNext7Days,
      readyJobs,
      needsRender,
      failedJobs,
      queueDepth,
      healthLabel,
    }
  })
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const [channelsRes, jobsRes] = await Promise.all([
    supabase.from("yt_channels").select("status, oauth_refresh_token"),
    supabase.from("yt_upload_jobs").select("status"),
  ])

  const channels = channelsRes.data ?? []
  const jobRows  = jobsRes.data ?? []

  const counts = (status: string) => jobRows.filter((j) => j.status === status).length

  return {
    totalChannels:    channels.length,
    oauthChannels:    channels.filter((c) => !!c.oauth_refresh_token).length,
    activeChannels:   channels.filter((c) => c.status === "active").length,
    failedJobs:       counts("failed"),
    needsAsset:       counts("needs_asset"),
    needsRender:      counts("needs_render"),
    pendingScheduled: counts("pending") + counts("scheduled"),
    processing:       counts("processing"),
    uploaded:         counts("uploaded"),
  }
}

export async function getFailedJobsPanel(limit = 20): Promise<FailedJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("id, producer_slug, title, yt_channels(channel_handle), error_message, retry_count, updated_at")
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (error) return []

  return (data ?? []).map((r) => ({
    id:            r.id,
    producerSlug:  r.producer_slug,
    title:         r.title ?? null,
    channelHandle: (r.yt_channels as any)?.channel_handle ?? null,
    errorMessage:  r.error_message ?? null,
    retryCount:    r.retry_count ?? 0,
    updatedAt:     r.updated_at,
  }))
}

export async function getQueueBottleneck(): Promise<BottleneckJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("id, producer_slug, title, status, yt_channels(channel_handle), created_at")
    .in("status", ["needs_asset", "needs_render"])
    .order("created_at", { ascending: true })
    .limit(20)

  if (error) return []

  return (data ?? []).map((r) => ({
    id:            r.id,
    producerSlug:  r.producer_slug,
    title:         r.title ?? null,
    status:        r.status,
    channelHandle: (r.yt_channels as any)?.channel_handle ?? null,
    createdAt:     r.created_at,
  }))
}

export async function getAppleMusicSyncHealth(): Promise<AppleMusicSyncHealth> {
  const [artistsRes, releasesRes, songsRes] = await Promise.all([
    supabase.from("artists").select("apple_music_id"),
    supabase.from("releases").select("apple_album_id"),
    supabase.from("songs").select("apple_song_id"),
  ])

  function countLinked<T extends Record<string, unknown>>(rows: T[], key: string): AppleMusicEntityHealth {
    const total  = rows.length
    const linked = rows.filter((r) => !!r[key]).length
    return { total, linked, missing: total - linked }
  }

  const artists  = countLinked(artistsRes.data  ?? [], "apple_music_id")
  const releases = countLinked(releasesRes.data ?? [], "apple_album_id")
  const songs    = countLinked(songsRes.data    ?? [], "apple_song_id")

  return { artists, releases, songs, hasLastSynced: false }
}
