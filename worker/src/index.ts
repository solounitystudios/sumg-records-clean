import { supabase } from "./supabase"
import { renderJob, isFfmpegAvailable, type RenderJob } from "./render"
import { log } from "./logger"

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS      = parseInt(process.env.WORKER_POLL_INTERVAL_MS    ?? "10000", 10)
const RENDER_TIMEOUT_MINUTES = parseInt(process.env.RENDER_TIMEOUT_MINUTES ?? "30",    10)

// ─── Startup ──────────────────────────────────────────────────────────────────

console.log("[worker] SUMG Render Worker")
console.log(`[worker] Poll: ${POLL_INTERVAL_MS}ms  Timeout: ${RENDER_TIMEOUT_MINUTES}min`)

if (!isFfmpegAvailable()) {
  console.error("[worker] FATAL: ffmpeg not found. Set FFMPEG_PATH or install ffmpeg.")
  process.exit(1)
}
console.log("[worker] ffmpeg OK")

// ─── Recovery: unstick jobs whose worker crashed mid-render ───────────────────

async function recoverStuckJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - RENDER_TIMEOUT_MINUTES * 60_000).toISOString()

  const { data: stuck } = await supabase
    .from("yt_upload_jobs")
    .select("id")
    .eq("status", "rendering")
    .lt("updated_at", cutoff)

  if (!stuck?.length) return

  for (const row of stuck as { id: string }[]) {
    const { error } = await supabase
      .from("yt_upload_jobs")
      .update({
        status:        "needs_render",
        error_message: `Worker timed out after ${RENDER_TIMEOUT_MINUTES}min — will retry`,
        updated_at:    new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "rendering")   // optimistic lock — skip if already changed

    if (!error) {
      console.warn(`[worker] Recovered stuck job: ${row.id}`)
      await log(row.id, null, "warn", `Recovered from stuck rendering after ${RENDER_TIMEOUT_MINUTES}min`)
    }
  }
}

// ─── Claim ────────────────────────────────────────────────────────────────────

async function claimNextJob(): Promise<RenderJob | null> {
  // Fetch oldest waiting job
  const { data: rows } = await supabase
    .from("yt_upload_jobs")
    .select("id, title, producer_slug, asset_id, thumbnail_asset_id, accent_color")
    .eq("status", "needs_render")
    .order("created_at", { ascending: true })
    .limit(1)

  if (!rows?.length) return null

  const candidate = rows[0] as RenderJob

  // Atomic claim: only succeed if status hasn't changed since we read it
  const { data: claimed, error } = await supabase
    .from("yt_upload_jobs")
    .update({ status: "rendering", updated_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "needs_render")
    .select("id")

  if (error || !claimed?.length) return null   // another worker beat us to this job
  return candidate
}

// ─── Poll tick ────────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  await recoverStuckJobs()

  const job = await claimNextJob()
  if (!job) return

  console.log(`[worker] Rendering job ${job.id} — "${job.title ?? "Untitled"}"`)
  await log(job.id, null, "info", `[render-worker] claimed job "${job.title ?? "Untitled"}"`)

  try {
    await renderJob(job)
    console.log(`[worker] ✓ ${job.id} done`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[worker] ✗ ${job.id} failed: ${msg}`)
    // renderJob already marked the DB row as failed — just log here
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  await log(null, null, "info", "[render-worker] started")
  console.log("[worker] polling…")

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick()
    } catch (err) {
      console.error("[worker] Unexpected tick error:", err)
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}

run().catch((err) => {
  console.error("[worker] Fatal:", err)
  process.exit(1)
})
