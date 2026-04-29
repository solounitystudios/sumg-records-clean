import { supabase } from "./supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

export type YtChannelStatus = "active" | "paused" | "revoked"
export type YtJobStatus = "needs_asset" | "needs_render" | "rendering" | "scheduled" | "pending" | "processing" | "uploaded" | "failed" | "cancelled"
export type EngineLogLevel = "info" | "warn" | "error"

export interface YtChannel {
  id: string
  producerSlug: string
  channelId: string
  channelHandle: string | null
  channelUrl: string | null
  uploadCadence: number
  titleTemplate: string | null
  descriptionTemplate: string | null
  defaultTags: string[]
  status: YtChannelStatus
  oauthConnected: boolean
  oauthConnectedAt: string | null
  // Routing
  preferredGenres: string[]
  bpmMin: number | null
  bpmMax: number | null
  routingPriority: number
  createdAt: string
  updatedAt: string
}

export interface YtUploadJob {
  id: string
  producerSlug: string
  assetId: string | null
  ytChannelId: string | null
  dnaPackId: string | null
  status: YtJobStatus
  title: string | null
  description: string | null
  tags: string[]
  scheduledAt: string | null
  uploadedAt: string | null
  ytVideoId: string | null
  ytVideoUrl: string | null
  errorMessage: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
  // Render config (consumed by external render worker)
  thumbnailAssetId?: string | null
  accentColor?: string | null
  // Joined
  channelHandle?: string | null
  assetFilename?: string | null
  assetMimeType?: string | null
}

export interface EngineLog {
  id: string
  jobId: string | null
  channelId: string | null
  level: EngineLogLevel
  message: string
  details: unknown
  createdAt: string
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toChannel(r: any): YtChannel {
  return {
    id:                  r.id,
    producerSlug:        r.producer_slug,
    channelId:           r.channel_id,
    channelHandle:       r.channel_handle ?? null,
    channelUrl:          r.channel_url ?? null,
    uploadCadence:       r.upload_cadence ?? 3,
    titleTemplate:       r.title_template ?? null,
    descriptionTemplate: r.description_template ?? null,
    defaultTags:         r.default_tags ?? [],
    status:              r.status ?? "active",
    oauthConnected:      !!r.oauth_refresh_token,
    oauthConnectedAt:    r.oauth_connected_at ?? null,
    preferredGenres:     r.preferred_genres ?? [],
    bpmMin:              r.bpm_min ?? null,
    bpmMax:              r.bpm_max ?? null,
    routingPriority:     r.routing_priority ?? 0,
    createdAt:           r.created_at,
    updatedAt:           r.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toJob(r: any): YtUploadJob {
  return {
    id:           r.id,
    producerSlug: r.producer_slug,
    assetId:      r.asset_id ?? null,
    ytChannelId:  r.yt_channel_id ?? null,
    dnaPackId:    r.dna_pack_id ?? null,
    status:       r.status,
    title:        r.title ?? null,
    description:  r.description ?? null,
    tags:         r.tags ?? [],
    scheduledAt:  r.scheduled_at ?? null,
    uploadedAt:   r.uploaded_at ?? null,
    ytVideoId:    r.yt_video_id ?? null,
    ytVideoUrl:   r.yt_video_url ?? null,
    errorMessage: r.error_message ?? null,
    retryCount:   r.retry_count ?? 0,
    createdAt:    r.created_at,
    updatedAt:    r.updated_at,
    thumbnailAssetId: r.thumbnail_asset_id ?? null,
    accentColor:      r.accent_color ?? null,
    channelHandle:    r.yt_channels?.channel_handle ?? null,
    assetFilename:    r.assets?.filename ?? null,
    assetMimeType:    r.assets?.mime_type ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLog(r: any): EngineLog {
  return {
    id:        r.id,
    jobId:     r.job_id ?? null,
    channelId: r.channel_id ?? null,
    level:     r.level,
    message:   r.message,
    details:   r.details ?? null,
    createdAt: r.created_at,
  }
}

// ─── Channel queries ──────────────────────────────────────────────────────────

export async function getAllChannels(): Promise<YtChannel[]> {
  const { data, error } = await supabase
    .from("yt_channels")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`getAllChannels: ${error.message}`)
  return (data ?? []).map(toChannel)
}

export async function getChannelsByProducer(producerSlug: string): Promise<YtChannel[]> {
  const { data, error } = await supabase
    .from("yt_channels")
    .select("*")
    .eq("producer_slug", producerSlug)
    .order("created_at", { ascending: false })
  if (error) throw new Error(`getChannelsByProducer: ${error.message}`)
  return (data ?? []).map(toChannel)
}

export async function getChannelById(id: string): Promise<YtChannel | null> {
  const { data, error } = await supabase
    .from("yt_channels")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return toChannel(data)
}

// ─── Job queries ──────────────────────────────────────────────────────────────

export async function getAllJobs(limit = 100): Promise<YtUploadJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("*, yt_channels(channel_handle), assets(filename, mime_type)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(`getAllJobs: ${error.message}`)
  return (data ?? []).map(toJob)
}

export async function getQueuedJobs(): Promise<YtUploadJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("*, yt_channels(channel_handle), assets(filename, mime_type)")
    .in("status", ["needs_asset", "needs_render", "rendering", "scheduled", "pending", "processing"])
    .order("created_at", { ascending: false })
  if (error) throw new Error(`getQueuedJobs: ${error.message}`)
  return (data ?? []).map(toJob)
}

export async function getJobsNeedingRender(): Promise<YtUploadJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("*, yt_channels(channel_handle), assets(filename, mime_type)")
    .eq("status", "needs_render")
    .order("created_at", { ascending: true })
  if (error) return []
  return (data ?? []).map(toJob)
}

export async function getJobsRendering(): Promise<YtUploadJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("*, yt_channels(channel_handle), assets(filename, mime_type)")
    .eq("status", "rendering")
    .order("updated_at", { ascending: false })
  if (error) return []
  return (data ?? []).map(toJob)
}

export async function getRecentUploads(limit = 10): Promise<YtUploadJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("*, yt_channels(channel_handle), assets(filename, mime_type)")
    .eq("status", "uploaded")
    .order("uploaded_at", { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []).map(toJob)
}

export async function getFailedJobs(): Promise<YtUploadJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("*, yt_channels(channel_handle), assets(filename, mime_type)")
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
  if (error) return []
  return (data ?? []).map(toJob)
}

export async function getJobsByProducer(producerSlug: string): Promise<YtUploadJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("*, yt_channels(channel_handle), assets(filename, mime_type)")
    .eq("producer_slug", producerSlug)
    .order("created_at", { ascending: false })
  if (error) throw new Error(`getJobsByProducer: ${error.message}`)
  return (data ?? []).map(toJob)
}

export async function getJobCounts(): Promise<Record<YtJobStatus, number>> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("status")
  if (error) throw new Error(`getJobCounts: ${error.message}`)
  const counts: Record<YtJobStatus, number> = { needs_asset: 0, needs_render: 0, rendering: 0, scheduled: 0, pending: 0, processing: 0, uploaded: 0, failed: 0, cancelled: 0 }
  for (const row of data ?? []) counts[row.status as YtJobStatus] = (counts[row.status as YtJobStatus] ?? 0) + 1
  return counts
}

export async function getProcessableJobCount(): Promise<number> {
  const now = new Date().toISOString()
  const { count, error } = await supabase
    .from("yt_upload_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "scheduled"])
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .not("asset_id", "is", null)
    .not("yt_channel_id", "is", null)
  if (error) return 0
  return count ?? 0
}

// ─── Engine log queries ────────────────────────────────────────────────────────

export async function getRecentLogs(limit = 25): Promise<EngineLog[]> {
  const { data, error } = await supabase
    .from("yt_engine_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []).map(toLog)
}
