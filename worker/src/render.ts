import { existsSync } from "fs"
import { mkdir, rm, writeFile, readFile } from "fs/promises"
import { join } from "path"
import { execSync, spawn } from "child_process"
import sharp from "sharp"
import { supabase, BUCKET } from "./supabase"
import { log } from "./logger"

// ─── FFmpeg detection ─────────────────────────────────────────────────────────

function detectFfmpegPath(): string | null {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH
  }
  for (const p of ["/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"]) {
    if (existsSync(p)) return p
  }
  try {
    const r = execSync("which ffmpeg", { stdio: "pipe", encoding: "utf8", timeout: 2_000 })
    if (r.trim()) return r.trim()
  } catch {}
  return null
}

export function isFfmpegAvailable(): boolean {
  return !!detectFfmpegPath()
}

// ─── Thumbnail generator ──────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c] ?? c),
  )
}

async function generatePlaceholder(title: string, producer: string, accentColor = "#3b82f6"): Promise<Buffer> {
  const t = escapeXml(title).slice(0, 60)
  const p = escapeXml(producer).slice(0, 40)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1920" y2="1080" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#080a0e"/>
        <stop offset="100%" stop-color="#0d1016"/>
      </linearGradient>
      <linearGradient id="line" x1="0" y1="0" x2="1920" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="${accentColor}" stop-opacity="0"/>
        <stop offset="50%"  stop-color="${accentColor}" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#bg)"/>
    <rect x="0" y="0"    width="1920" height="1" fill="url(#line)"/>
    <rect x="0" y="1079" width="1920" height="1" fill="url(#line)"/>
    <rect x="760" y="539" width="400" height="1" fill="${accentColor}" opacity="0.25"/>
    <text x="960" y="490" font-family="Arial,Helvetica,sans-serif" font-size="84" font-weight="bold"
      fill="white" text-anchor="middle" opacity="0.9">${t}</text>
    <text x="960" y="580" font-family="Arial,Helvetica,sans-serif" font-size="38"
      fill="white" text-anchor="middle" opacity="0.4">${p}</text>
    <text x="960" y="656" font-family="Arial,Helvetica,sans-serif" font-size="20" letter-spacing="8"
      fill="${accentColor}" text-anchor="middle" opacity="0.55">FREE BEAT</text>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ─── FFmpeg runner ────────────────────────────────────────────────────────────

function runFfmpeg(ffmpegPath: string, imagePath: string, audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-loop", "1", "-framerate", "1",
      "-i", imagePath,
      "-i", audioPath,
      "-c:v", "libx264", "-preset", "fast", "-tune", "stillimage",
      "-c:a", "aac", "-b:a", "192k",
      "-shortest",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outputPath,
    ]
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] })
    const stderr: Buffer[] = []
    proc.stderr?.on("data", (d: Buffer) => stderr.push(d))
    proc.on("error", reject)
    proc.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(stderr).toString().slice(-600)}`))
    })
  })
}

// ─── Public render interface ──────────────────────────────────────────────────

export interface RenderJob {
  id:                 string
  title:              string | null
  producer_slug:      string
  asset_id:           string | null
  thumbnail_asset_id: string | null
  accent_color:       string | null
}

export async function renderJob(job: RenderJob): Promise<void> {
  const ffmpegPath = detectFfmpegPath()
  if (!ffmpegPath) {
    throw new Error(
      "ffmpeg not found. Set FFMPEG_PATH or install ffmpeg (apt-get install -y ffmpeg).",
    )
  }

  const tmpDir = `/tmp/yt_render_${job.id}`
  await mkdir(tmpDir, { recursive: true })

  try {
    // 1 — Fetch audio asset
    if (!job.asset_id) throw new Error("Job has no audio asset assigned")

    const { data: audioRow, error: audioErr } = await supabase
      .from("assets")
      .select("url, mime_type, filename")
      .eq("id", job.asset_id)
      .single()

    if (audioErr || !audioRow) throw new Error(`Audio asset ${job.asset_id} not found: ${audioErr?.message}`)
    const audio = audioRow as { url: string; mime_type: string | null; filename: string | null }
    if (!audio.url) throw new Error("Audio asset has no storage URL")

    await log(job.id, null, "info", `Downloading audio: ${audio.filename ?? job.asset_id}`)
    const audioRes = await fetch(audio.url)
    if (!audioRes.ok) throw new Error(`Audio fetch failed (HTTP ${audioRes.status})`)
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
    const audioExt    = audio.filename?.split(".").pop() ?? "mp3"
    const audioPath   = join(tmpDir, `audio.${audioExt}`)
    await writeFile(audioPath, audioBuffer)

    // 2 — Thumbnail: use assigned asset or generate placeholder
    const imagePath = join(tmpDir, "thumbnail.png")

    if (job.thumbnail_asset_id) {
      const { data: imgRow } = await supabase
        .from("assets")
        .select("url, filename")
        .eq("id", job.thumbnail_asset_id)
        .single()

      if (imgRow) {
        const img    = imgRow as { url: string; filename: string | null }
        const imgRes = await fetch(img.url)
        if (!imgRes.ok) throw new Error(`Thumbnail fetch failed (HTTP ${imgRes.status})`)
        const pngBuf = await sharp(Buffer.from(await imgRes.arrayBuffer()))
          .resize(1920, 1080, { fit: "cover", position: "centre" })
          .png()
          .toBuffer()
        await writeFile(imagePath, pngBuf)
        await log(job.id, null, "info", `Using thumbnail: ${img.filename ?? job.thumbnail_asset_id}`)
      }
    }

    if (!existsSync(imagePath)) {
      await log(job.id, null, "info", "Generating placeholder thumbnail")
      const buf = await generatePlaceholder(
        job.title ?? "Untitled Beat",
        job.producer_slug,
        job.accent_color ?? "#3b82f6",
      )
      await writeFile(imagePath, buf)
    }

    // 3 — ffmpeg render
    const outputPath = join(tmpDir, "output.mp4")
    await log(job.id, null, "info", "Running ffmpeg")
    await runFfmpeg(ffmpegPath, imagePath, audioPath, outputPath)

    // 4 — Upload MP4 to storage
    const mp4Buffer   = await readFile(outputPath)
    const sizeBytes   = mp4Buffer.length
    const storagePath = `renders/${job.id}.mp4`

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, mp4Buffer, { contentType: "video/mp4", cacheControl: "3600", upsert: true })
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    await log(job.id, null, "info", `MP4 uploaded (${(sizeBytes / 1_048_576).toFixed(1)} MB)`)

    // 5 — Upsert asset record (idempotent: re-renders reuse same row)
    const renderFilename = `render_${job.id}.mp4`
    const { data: existing } = await supabase
      .from("assets")
      .select("id")
      .eq("filename", renderFilename)
      .maybeSingle()

    let newAssetId: string

    if (existing) {
      const row = existing as { id: string }
      await supabase
        .from("assets")
        .update({ url: publicUrl, size_bytes: sizeBytes, alt_text: job.title ?? null })
        .eq("id", row.id)
      newAssetId = row.id
    } else {
      const { data: assetRow, error: dbErr } = await supabase
        .from("assets")
        .insert({
          type:        "video",
          url:         publicUrl,
          filename:    renderFilename,
          mime_type:   "video/mp4",
          size_bytes:  sizeBytes,
          alt_text:    job.title ?? null,
          attached_to: null,
          uploaded_by: "render_worker",
        })
        .select("id")
        .single()
      if (dbErr) throw new Error(`Asset DB insert failed: ${dbErr.message}`)
      newAssetId = (assetRow as { id: string }).id
    }

    // 6 — Advance job status (scheduled if already has scheduled_at, else pending)
    const { data: sched } = await supabase
      .from("yt_upload_jobs")
      .select("scheduled_at")
      .eq("id", job.id)
      .single()

    const newStatus = (sched as { scheduled_at: string | null } | null)?.scheduled_at
      ? "scheduled"
      : "pending"

    await supabase
      .from("yt_upload_jobs")
      .update({ asset_id: newAssetId, status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", job.id)

    await log(job.id, null, "info", `Job → ${newStatus} (asset: ${newAssetId})`)
  } catch (err) {
    // Mark failed so the admin render page surfaces it
    await supabase
      .from("yt_upload_jobs")
      .update({
        status:        "failed",
        error_message: `Render failed: ${err instanceof Error ? err.message : String(err)}`,
        updated_at:    new Date().toISOString(),
      })
      .eq("id", job.id)
    throw err
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}
