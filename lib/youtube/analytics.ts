import "server-only"
import { supabase } from "@/lib/db/supabase"
import { getValidToken } from "./oauth"

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.YOUTUBE_API_KEY ?? ""

// YouTube Data API v3 — quota costs:
//   videos.list  : 1 unit / call (up to 50 video IDs per call)
//   channels.list: 1 unit / call (up to 50 channel IDs per call)
// Daily quota: 10,000 units.  Max cron cost ≈ ceil(200/50) + ceil(N_channels/50) ≈ <20 units/run.

const YT_VIDEOS_URL   = "https://www.googleapis.com/youtube/v3/videos"
const YT_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsSyncSummary {
  videosSynced:    number
  videosSkipped:   number
  channelsSynced:  number
  channelsSkipped: number
  errors:          string[]
}

interface YTVideoItem {
  id:         string
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string }
}

interface YTChannelItem {
  id:         string
  statistics: { subscriberCount?: string; viewCount?: string }
}

// ─── Raw API calls ────────────────────────────────────────────────────────────

async function ytVideosBatch(videoIds: string[], accessToken?: string): Promise<YTVideoItem[]> {
  const params = new URLSearchParams({ part: "statistics", id: videoIds.join(",") })
  const headers: Record<string, string> = {}

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  } else if (API_KEY) {
    params.set("key", API_KEY)
  } else {
    throw new Error("No YOUTUBE_API_KEY and no OAuth token — cannot fetch video stats")
  }

  const res = await fetch(`${YT_VIDEOS_URL}?${params}`, { headers, cache: "no-store" })
  if (!res.ok) throw new Error(`videos.list ${res.status}: ${await res.text()}`)
  const body = (await res.json()) as { items?: YTVideoItem[] }
  return body.items ?? []
}

async function ytChannelsBatch(channelIds: string[], accessToken?: string): Promise<YTChannelItem[]> {
  const params = new URLSearchParams({ part: "statistics", id: channelIds.join(",") })
  const headers: Record<string, string> = {}

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  } else if (API_KEY) {
    params.set("key", API_KEY)
  } else {
    throw new Error("No YOUTUBE_API_KEY and no OAuth token — cannot fetch channel stats")
  }

  const res = await fetch(`${YT_CHANNELS_URL}?${params}`, { headers, cache: "no-store" })
  if (!res.ok) throw new Error(`channels.list ${res.status}: ${await res.text()}`)
  const body = (await res.json()) as { items?: YTChannelItem[] }
  return body.items ?? []
}

// ─── Post-sync: recompute derived fields ──────────────────────────────────────

/**
 * For each channel that now has per-job view_count data:
 *  - monthly_views   = sum of view_count on jobs uploaded in the last 30 days
 *  - avg_views_per_upload = rolling mean over all jobs with view_count (min 3 data points)
 *
 * Only updates channels that have at least one synced data point, so manually
 * entered estimates are never overwritten with zeros.
 */
async function recomputeChannelAggregates(channelDbIds: string[]): Promise<void> {
  if (!channelDbIds.length) return

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const { data: jobs } = await supabase
    .from("yt_upload_jobs")
    .select("yt_channel_id, view_count, uploaded_at")
    .eq("status", "uploaded")
    .in("yt_channel_id", channelDbIds)
    .not("view_count", "is", null)

  if (!jobs?.length) return

  // Build per-channel aggregates
  const monthly   = new Map<string, number>()
  const allViews  = new Map<string, number[]>()

  for (const j of jobs) {
    if (j.yt_channel_id == null || j.view_count == null) continue
    const id  = j.yt_channel_id as string
    const vc  = j.view_count as number

    // All-time average
    const arr = allViews.get(id) ?? []
    arr.push(vc)
    allViews.set(id, arr)

    // Monthly total
    if (j.uploaded_at && j.uploaded_at >= cutoff) {
      monthly.set(id, (monthly.get(id) ?? 0) + vc)
    }
  }

  for (const [id, views] of allViews) {
    const updates: Record<string, unknown> = {}

    if (monthly.has(id)) {
      updates.monthly_views = monthly.get(id)
    }

    // Only update the average with ≥3 data points to avoid noise
    if (views.length >= 3) {
      updates.avg_views_per_upload = Math.round(views.reduce((a, b) => a + b, 0) / views.length)
    }

    if (Object.keys(updates).length) {
      await supabase.from("yt_channels").update(updates).eq("id", id)
    }
  }
}

// ─── Video stats sync ─────────────────────────────────────────────────────────

/**
 * Syncs view_count / like_count / comment_count for the most recent uploaded jobs.
 *
 * Auth strategy per channel (first available wins):
 *   1. Valid OAuth access token from yt_channels
 *   2. YOUTUBE_API_KEY env var (works for any public video)
 *   3. Skip — neither available
 */
export async function syncRecentUploads(maxJobs = 200): Promise<Pick<AnalyticsSyncSummary, "videosSynced" | "videosSkipped" | "errors">> {
  const { data: jobs } = await supabase
    .from("yt_upload_jobs")
    .select("id, yt_video_id, yt_channel_id")
    .eq("status", "uploaded")
    .not("yt_video_id", "is", null)
    .not("yt_channel_id", "is", null)
    .order("uploaded_at", { ascending: false })
    .limit(maxJobs)

  if (!jobs?.length) return { videosSynced: 0, videosSkipped: 0, errors: [] }

  // Group jobs by channel so we can reuse one token per channel
  const byChannel = new Map<string, { id: string; yt_video_id: string }[]>()
  for (const j of jobs) {
    if (!j.yt_video_id || !j.yt_channel_id) continue
    const list = byChannel.get(j.yt_channel_id as string) ?? []
    list.push({ id: j.id, yt_video_id: j.yt_video_id as string })
    byChannel.set(j.yt_channel_id as string, list)
  }

  let videosSynced   = 0
  let videosSkipped  = 0
  const errors:   string[] = []
  const syncedChannelIds: string[] = []
  const now = new Date().toISOString()

  for (const [channelDbId, channelJobs] of byChannel) {
    // Resolve auth
    let token: string | undefined
    try { token = await getValidToken(channelDbId) } catch { token = undefined }

    if (!token && !API_KEY) {
      videosSkipped += channelJobs.length
      continue
    }

    // Batch in groups of 50
    for (let i = 0; i < channelJobs.length; i += 50) {
      const batch    = channelJobs.slice(i, i + 50)
      const videoIds = batch.map((j) => j.yt_video_id)

      try {
        const items    = await ytVideosBatch(videoIds, token)
        const statsMap = new Map(items.map((s) => [s.id, s.statistics]))

        for (const job of batch) {
          const s = statsMap.get(job.yt_video_id)
          if (!s) { videosSkipped++; continue }

          await supabase.from("yt_upload_jobs").update({
            view_count:             s.viewCount    != null ? parseInt(s.viewCount,    10) : null,
            like_count:             s.likeCount    != null ? parseInt(s.likeCount,    10) : null,
            comment_count:          s.commentCount != null ? parseInt(s.commentCount, 10) : null,
            stats_last_synced_at:   now,
          }).eq("id", job.id)

          videosSynced++
        }

        syncedChannelIds.push(channelDbId)

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`videos batch [${channelDbId.slice(0, 8)}]: ${msg}`)
        videosSkipped += batch.length
      }
    }
  }

  // Recompute monthly_views and avg_views_per_upload from fresh data
  await recomputeChannelAggregates([...new Set(syncedChannelIds)])

  return { videosSynced, videosSkipped, errors }
}

// ─── Channel stats sync ───────────────────────────────────────────────────────

/**
 * Syncs subscriber_count from YouTube Data API for all active channels.
 *
 * Note: YouTube may hide subscriber counts for some channels (returns 0 or missing).
 * We only write if the API returns a non-zero value to avoid clobbering manual data.
 *
 * Auth strategy: OAuth per channel first, then API key batch for remainder.
 */
export async function syncChannelStats(): Promise<Pick<AnalyticsSyncSummary, "channelsSynced" | "channelsSkipped" | "errors">> {
  const { data: channels } = await supabase
    .from("yt_channels")
    .select("id, channel_id, oauth_refresh_token")
    .eq("status", "active")
    .not("channel_id", "is", null)

  if (!channels?.length) return { channelsSynced: 0, channelsSkipped: 0, errors: [] }

  let channelsSynced   = 0
  let channelsSkipped  = 0
  const errors: string[] = []
  const now = new Date().toISOString()

  // Partition: channels that can use API key (all of them) vs also have OAuth
  // We prefer OAuth → API key fallback within the same loop
  const needsApiKey: { dbId: string; channelId: string }[] = []

  for (const ch of channels) {
    const dbId     = ch.id as string
    const ytChanId = ch.channel_id as string

    // Try OAuth first
    if (ch.oauth_refresh_token) {
      try {
        const token = await getValidToken(dbId)
        const items = await ytChannelsBatch([ytChanId], token)
        const s     = items[0]?.statistics

        if (s) {
          await writeChannelStats(dbId, s, now, null)
          channelsSynced++
          continue
        }
      } catch (err) {
        // OAuth failed — fall through to API key
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`OAuth channel ${ytChanId}: ${msg} — falling back to API key`)
      }
    }

    // Queue for API key batch
    if (API_KEY) {
      needsApiKey.push({ dbId, channelId: ytChanId })
    } else {
      channelsSkipped++
      await supabase.from("yt_channels").update({
        stats_sync_error: "No YOUTUBE_API_KEY and OAuth unavailable",
      }).eq("id", dbId)
    }
  }

  // Batch API key requests (50 channels / call)
  for (let i = 0; i < needsApiKey.length; i += 50) {
    const batch      = needsApiKey.slice(i, i + 50)
    const channelIds = batch.map((c) => c.channelId)

    try {
      const items    = await ytChannelsBatch(channelIds)
      const statsMap = new Map(items.map((s) => [s.id, s.statistics]))

      for (const ch of batch) {
        const s = statsMap.get(ch.channelId)
        if (!s) { channelsSkipped++; continue }
        await writeChannelStats(ch.dbId, s, now, null)
        channelsSynced++
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`channels.list batch: ${msg}`)
      channelsSkipped += batch.length

      // Record error on each affected channel
      for (const ch of batch) {
        await supabase.from("yt_channels").update({ stats_sync_error: msg }).eq("id", ch.dbId)
      }
    }
  }

  return { channelsSynced, channelsSkipped, errors }
}

async function writeChannelStats(
  dbId:    string,
  s:       YTChannelItem["statistics"],
  now:     string,
  error:   string | null,
): Promise<void> {
  const updates: Record<string, unknown> = {
    stats_last_synced_at: now,
    stats_sync_error:     error,
  }

  // Only overwrite subscriber_count if the API returns a non-zero value.
  // YouTube hides subscriber counts for some channels (omits the field or returns "0").
  if (s.subscriberCount && parseInt(s.subscriberCount, 10) > 0) {
    updates.subscriber_count = parseInt(s.subscriberCount, 10)
  }

  await supabase.from("yt_channels").update(updates).eq("id", dbId)
}

// ─── Combined entry point for cron ───────────────────────────────────────────

export async function runAnalyticsSync(maxJobs = 200): Promise<AnalyticsSyncSummary> {
  const [videos, channels] = await Promise.all([
    syncRecentUploads(maxJobs),
    syncChannelStats(),
  ])

  return {
    videosSynced:    videos.videosSynced,
    videosSkipped:   videos.videosSkipped,
    channelsSynced:  channels.channelsSynced,
    channelsSkipped: channels.channelsSkipped,
    errors:          [...videos.errors, ...channels.errors],
  }
}
