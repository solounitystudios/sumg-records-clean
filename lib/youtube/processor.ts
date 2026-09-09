import "server-only"
import { supabase } from "@/lib/db/supabase"
import { getAssetById } from "@/lib/db/assets"
import { getValidToken, isOAuthConfigured } from "./oauth"
import { uploadToYouTube } from "./uploader"
import type { ProcessResult, ProcessSummary } from "./types"

export type { ProcessResult, ProcessSummary }

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function addLog(
  jobId:     string | null,
  channelId: string | null,
  level:     "info" | "warn" | "error",
  message:   string,
  details?:  unknown,
) {
  await supabase.from("yt_engine_logs").insert({
    job_id: jobId, channel_id: channelId, level, message,
    details: details ?? null,
  })
}

// ─── Recovery: unstick jobs frozen at "processing" ────────────────────────────
// Jobs crash mid-upload (Vercel timeout, OOM, etc.) get stuck at "processing"
// indefinitely — fetchReadyJobs only selects pending/scheduled, so they never
// retry on their own. After 10 minutes we treat them as failed and let the
// normal retry counter handle re-queuing.

const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000

async function recoverStuckJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - PROCESSING_TIMEOUT_MS).toISOString()
  const { data: stuck, error: stuckErr } = await supabase
    .from("yt_upload_jobs")
    .select("id, retry_count")
    .eq("status", "processing")
    .lt("updated_at", cutoff)

  if (stuckErr) console.error("[processor] stuck jobs query:", stuckErr.message, stuckErr.details)
  if (!stuck?.length) return 0

  let recovered = 0
  for (const job of stuck as Array<{ id: string; retry_count: number }>) {
    const newRetryCount = (job.retry_count ?? 0) + 1
    const newStatus = newRetryCount >= MAX_RETRIES ? "failed" : "pending"
    await supabase.from("yt_upload_jobs").update({
      status:        newStatus,
      error_message: `Recovered from stuck processing state after ${PROCESSING_TIMEOUT_MS / 60000}min timeout`,
      retry_count:   newRetryCount,
      updated_at:    new Date().toISOString(),
    }).eq("id", job.id).eq("status", "processing")
    await addLog(job.id, null, "warn",
      `Recovered stuck job → ${newStatus} (retry ${newRetryCount}/${MAX_RETRIES})`)
    recovered++
  }
  return recovered
}

// ─── Job fetching ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 5

interface RawJob {
  id:            string
  title:         string | null
  description:   string | null
  tags:          string[]
  asset_id:      string | null
  yt_channel_id: string | null
  scheduled_at:  string | null
  status:        string
  retry_count:   number
  yt_channels:   { channel_id: string; channel_handle: string | null; oauth_refresh_token: string | null } | null
}

async function fetchReadyJobs(): Promise<RawJob[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select("id, title, description, tags, asset_id, yt_channel_id, scheduled_at, status, retry_count, yt_channels(channel_id, channel_handle, oauth_refresh_token)")
    .in("status", ["pending", "scheduled"])
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .not("asset_id", "is", null)
    .not("yt_channel_id", "is", null)
    .lt("retry_count", MAX_RETRIES)
    .order("created_at", { ascending: true })
    .limit(10)

  if (error) throw new Error(`fetchReadyJobs: ${error.message}`)
  return (data ?? []) as any
}

// ─── Real job processor ───────────────────────────────────────────────────────

async function runJobReal(job: RawJob): Promise<ProcessResult> {
  const jobId    = job.id
  const chanId   = job.yt_channel_id
  const title    = job.title ?? "Untitled"

  try {
    if (!job.yt_channels) throw new Error("No channel linked to this job")
    if (!job.asset_id)    throw new Error("No asset linked to this job")
    if (!job.title)       throw new Error("Job has no title")

    const asset = await getAssetById(job.asset_id)
    if (!asset)     throw new Error(`Asset ${job.asset_id} not found in storage`)
    if (!asset.url) throw new Error("Asset has no storage URL")

    // Validate MIME before billing the processing slot
    const mime = asset.mime_type ?? ""
    if (!mime.startsWith("video/")) {
      throw new Error(
        `Asset "${asset.filename}" is ${mime || "unknown type"} — ` +
        `YouTube requires video/mp4. Render your beat to MP4 (audio + loop visual) and re-upload.`,
      )
    }

    // Mark processing
    const { error: markProcessingErr } = await supabase.from("yt_upload_jobs").update({
      status: "processing", updated_at: new Date().toISOString(),
    }).eq("id", jobId)
    if (markProcessingErr) console.error("[processor] mark processing:", markProcessingErr.message, markProcessingErr.details)
    await addLog(jobId, chanId, "info", `Processing: "${title}" (${asset.filename})`)

    const token = await getValidToken(chanId!)
    await addLog(jobId, chanId, "info", "OAuth token validated")

    const result = await uploadToYouTube(token, asset.url, mime, {
      title,
      description: job.description ?? "",
      tags:        job.tags ?? [],
    })

    const { error: markUploadedErr } = await supabase.from("yt_upload_jobs").update({
      status:        "uploaded",
      yt_video_id:   result.videoId,
      yt_video_url:  result.videoUrl,
      uploaded_at:   new Date().toISOString(),
      updated_at:    new Date().toISOString(),
      error_message: null,
    }).eq("id", jobId)
    if (markUploadedErr) console.error("[processor] mark uploaded:", markUploadedErr.message, markUploadedErr.details)

    const { error: inboxErr } = await supabase.from("audio_inbox").update({
      status:     "uploaded",
      updated_at: new Date().toISOString(),
    }).eq("yt_job_id", jobId)
    if (inboxErr) console.error("[processor] inbox status update:", inboxErr.message, inboxErr.details)

    await addLog(jobId, chanId, "info", `Uploaded: ${result.videoUrl}`, { videoId: result.videoId })
    return { jobId, title, status: "uploaded", videoId: result.videoId, videoUrl: result.videoUrl, simulated: false }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const newRetryCount = (job.retry_count ?? 0) + 1
    const { error: markFailedErr } = await supabase.from("yt_upload_jobs").update({
      status:        "failed",
      error_message: message,
      retry_count:   newRetryCount,
      updated_at:    new Date().toISOString(),
    }).eq("id", jobId)
    if (markFailedErr) console.error("[processor] mark failed:", markFailedErr.message, markFailedErr.details)
    const exhausted = newRetryCount >= MAX_RETRIES
    await addLog(jobId, chanId, "error",
      exhausted
        ? `Failed (retry ${newRetryCount}/${MAX_RETRIES} — max retries reached, job will not auto-retry): ${message}`
        : `Failed (retry ${newRetryCount}/${MAX_RETRIES}): ${message}`,
    )
    return { jobId, title, status: "failed", error: message, simulated: false }
  }
}

// ─── Safe-mode simulator ──────────────────────────────────────────────────────

async function runJobSimulated(job: RawJob): Promise<ProcessResult> {
  const jobId  = job.id
  const chanId = job.yt_channel_id
  const title  = job.title ?? "Untitled"
  const chan    = job.yt_channels

  const missing: string[] = []
  if (!chan?.oauth_refresh_token) missing.push("OAuth credentials (channel not connected)")
  if (!job.title)                 missing.push("title")

  let assetNote = "asset OK"
  if (job.asset_id) {
    const asset = await getAssetById(job.asset_id)
    if (!asset) {
      missing.push("asset not found in storage")
    } else if (!asset.mime_type?.startsWith("video/")) {
      missing.push(`video file (asset is ${asset.mime_type ?? "unknown"} — render to MP4 first)`)
      assetNote = `${asset.filename} (${asset.mime_type})`
    } else {
      assetNote = `${asset.filename} (${asset.mime_type})`
    }
  } else {
    missing.push("asset not assigned")
  }

  if (missing.length) {
    const msg = `[SAFE MODE] Would fail — ${missing.join("; ")}`
    await addLog(jobId, chanId, "warn", msg, { assetNote })
    return { jobId, title, status: "skipped", error: msg, simulated: true }
  }

  const chanName = chan?.channel_handle ?? chan?.channel_id ?? "unknown"
  const msg = `[SAFE MODE] Would upload "${title}" → ${chanName} (${assetNote})`
  await addLog(jobId, chanId, "info", msg)
  return { jobId, title, status: "skipped", simulated: true }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function runProcessor(): Promise<ProcessSummary> {
  const safeMode = !isOAuthConfigured()

  await addLog(null, null, "info", safeMode
    ? "[SAFE MODE] Processor triggered — OAuth not configured, simulating all jobs"
    : "Processor triggered",
  )

  const recoveredCount = await recoverStuckJobs()
  if (recoveredCount > 0) {
    await addLog(null, null, "warn", `Recovered ${recoveredCount} stuck processing job${recoveredCount !== 1 ? "s" : ""}`)
  }

  const jobs    = await fetchReadyJobs()
  const results: ProcessResult[] = []

  for (const job of jobs) {
    const result = safeMode ? await runJobSimulated(job) : await runJobReal(job)
    results.push(result)
  }

  const uploaded = results.filter(r => r.status === "uploaded").length
  const failed   = results.filter(r => r.status === "failed").length
  const skipped  = results.filter(r => r.status === "skipped").length

  await addLog(null, null, "info",
    `Run complete — ${jobs.length} processed: ${uploaded} uploaded, ${failed} failed, ${skipped} skipped`,
  )

  return { processed: jobs.length, uploaded, failed, skipped, results, safeMode }
}
