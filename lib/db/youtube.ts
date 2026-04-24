import { supabase } from "./supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

export type YtChannelStatus = "active" | "paused" | "revoked"
export type YtJobStatus = "pending" | "processing" | "uploaded" | "failed" | "cancelled"

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
  createdAt: string
  updatedAt: string
}

export interface YtUploadJob {
  id: string
  producerSlug: string
  assetId: string
  ytChannelId: string
  status: YtJobStatus
  title: string | null
  description: string | null
  tags: string[]
  scheduledAt: string | null
  uploadedAt: string | null
  ytVideoId: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  // Joined
  channelHandle?: string | null
  assetFilename?: string | null
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toChannel(r: any): YtChannel {
  return {
    id: r.id,
    producerSlug: r.producer_slug,
    channelId: r.channel_id,
    channelHandle: r.channel_handle ?? null,
    channelUrl: r.channel_url ?? null,
    uploadCadence: r.upload_cadence ?? 3,
    titleTemplate: r.title_template ?? null,
    descriptionTemplate: r.description_template ?? null,
    defaultTags: r.default_tags ?? [],
    status: r.status ?? "active",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toJob(r: any): YtUploadJob {
  return {
    id: r.id,
    producerSlug: r.producer_slug,
    assetId: r.asset_id,
    ytChannelId: r.yt_channel_id,
    status: r.status,
    title: r.title ?? null,
    description: r.description ?? null,
    tags: r.tags ?? [],
    scheduledAt: r.scheduled_at ?? null,
    uploadedAt: r.uploaded_at ?? null,
    ytVideoId: r.yt_video_id ?? null,
    errorMessage: r.error_message ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    channelHandle: r.yt_channels?.channel_handle ?? null,
    assetFilename: r.assets?.filename ?? null,
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
    .select("*, yt_channels(channel_handle), assets(filename)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(`getAllJobs: ${error.message}`)
  return (data ?? []).map(toJob)
}

export async function getQueuedJobs(): Promise<YtUploadJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("*, yt_channels(channel_handle), assets(filename)")
    .in("status", ["pending", "processing"])
    .order("scheduled_at", { ascending: true })
  if (error) throw new Error(`getQueuedJobs: ${error.message}`)
  return (data ?? []).map(toJob)
}

export async function getJobsByProducer(producerSlug: string): Promise<YtUploadJob[]> {
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("*, yt_channels(channel_handle), assets(filename)")
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
  const counts: Record<YtJobStatus, number> = { pending: 0, processing: 0, uploaded: 0, failed: 0, cancelled: 0 }
  for (const row of data ?? []) counts[row.status as YtJobStatus] = (counts[row.status as YtJobStatus] ?? 0) + 1
  return counts
}
