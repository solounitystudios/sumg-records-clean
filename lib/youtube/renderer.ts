import "server-only"
import { existsSync } from "fs"
import { mkdir, rm, writeFile, readFile } from "fs/promises"
import { join } from "path"
import { execSync, spawn } from "child_process"
import sharp from "sharp"
import { supabase } from "@/lib/db/supabase"
import { getAssetById } from "@/lib/db/assets"

// ─── FFmpeg detection ─────────────────────────────────────────────────────────

function detectFfmpegPath(): string | null {
  // 1. Explicit env override (recommended for production)
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH
  }

  // 2. Known static binary locations
  const candidates = [
    "/tmp/ffmpeg/ffmpeg",       // downloaded static binary (dev)
    "/usr/local/bin/ffmpeg",    // homebrew / custom install
    "/usr/bin/ffmpeg",          // apt install ffmpeg
    "/opt/homebrew/bin/ffmpeg", // macOS arm64
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }

  // 3. System PATH
  try {
    const result = execSync("which ffmpeg", { stdio: "pipe", encoding: "utf8", timeout: 2_000 })
    if (result.trim()) return result.trim()
  } catch {}

  return null
}

export function isFfmpegAvailable(): boolean {
  return !!detectFfmpegPath()
}

export function getFfmpegPath(): string | null {
  return detectFfmpegPath()
}

export function getDeploymentOptions(): string[] {
  return [
    "Set FFMPEG_PATH environment variable to the absolute path of your ffmpeg binary.",
    "Railway / Render.com / Fly.io — add to Dockerfile: RUN apt-get install -y ffmpeg",
    "VPS / self-hosted — run: sudo apt install ffmpeg, then restart the app.",
    "Vercel — not supported (serverless has no binary execution). Use a dedicated render worker or pre-render externally.",
    "AWS Lambda — add the public ffmpeg layer: arn:aws:lambda:us-east-1:145266761615:layer:ffmpeg:1",
    "Dev — download a static binary to /tmp/ffmpeg/ffmpeg (see project README for the curl command).",
  ]
}

// ─── Placeholder thumbnail generation ────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c] ?? c))
}

async function generatePlaceholder(
  title:       string,
  producer:    string,
  accentColor = "#3b82f6",
): Promise<Buffer> {
  const safeTitle    = escapeXml(title).slice(0, 60)
  const safeProducer = escapeXml(producer).slice(0, 40)

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
    <text x="960" y="490"
      font-family="Arial,Helvetica,sans-serif" font-size="84" font-weight="bold"
      fill="white" text-anchor="middle" opacity="0.9">${safeTitle}</text>
    <text x="960" y="580"
      font-family="Arial,Helvetica,sans-serif" font-size="38"
      fill="white" text-anchor="middle" opacity="0.4">${safeProducer}</text>
    <text x="960" y="656"
      font-family="Arial,Helvetica,sans-serif" font-size="20" letter-spacing="8"
      fill="${accentColor}" text-anchor="middle" opacity="0.55">FREE BEAT</text>
  </svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ─── FFmpeg render ─────────────────────────────────────────────────────────────

function runFfmpeg(ffmpegPath: string, imagePath: string, audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-loop",     "1",
      "-framerate", "1",
      "-i",        imagePath,
      "-i",        audioPath,
      "-c:v",      "libx264",
      "-preset",   "fast",
      "-tune",     "stillimage",
      "-c:a",      "aac",
      "-b:a",      "192k",
      "-shortest",
      "-pix_fmt",  "yuv420p",
      "-movflags", "+faststart",
      outputPath,
    ]

    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] })
    const stderr: Buffer[] = []
    proc.stderr?.on("data", (d: Buffer) => stderr.push(d))

    proc.on("error", reject)
    proc.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        const log = Buffer.concat(stderr).toString().slice(-600)
        reject(new Error(`ffmpeg exited ${code}: ${log}`))
      }
    })
  })
}

// ─── Public render interface ──────────────────────────────────────────────────

export interface RenderOptions {
  jobId:             string
  title:             string
  producer:          string
  thumbnailAssetId?: string | null
  accentColor?:      string
}

export interface RenderResult {
  assetId:   string
  assetUrl:  string
  sizeBytes: number
}

const BUCKET = "sumg-assets"

export async function renderJobToMp4(opts: RenderOptions): Promise<RenderResult> {
  const ffmpegPath = detectFfmpegPath()
  if (!ffmpegPath) {
    throw new Error(
      "ffmpeg binary not found. Set FFMPEG_PATH to the binary path, or install ffmpeg on the server. " +
      "See /admin/youtube/render for deployment options.",
    )
  }

  const tmpDir = `/tmp/yt_render_${opts.jobId}`
  await mkdir(tmpDir, { recursive: true })

  try {
    // 1 — Fetch audio asset for this job
    const { data: jobRow, error: jobErr } = await supabase
      .from("yt_upload_jobs")
      .select("asset_id, assets(url, mime_type, filename)")
      .eq("id", opts.jobId)
      .single()

    if (jobErr || !jobRow) throw new Error("Job not found")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioAsset = (jobRow as any).assets
    if (!audioAsset?.url) throw new Error("Audio asset has no storage URL")

    // Download audio
    const audioRes = await fetch(audioAsset.url, { cache: "no-store" })
    if (!audioRes.ok) throw new Error(`Failed to fetch audio (${audioRes.status})`)
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
    const audioExt    = (audioAsset.filename as string | null)?.split(".").pop() ?? "mp3"
    const audioPath   = join(tmpDir, `audio.${audioExt}`)
    await writeFile(audioPath, audioBuffer)

    // 2 — Get/generate thumbnail image (1920×1080 PNG)
    const imagePath = join(tmpDir, "thumbnail.png")

    if (opts.thumbnailAssetId) {
      const imgAsset = await getAssetById(opts.thumbnailAssetId)
      if (!imgAsset?.url) throw new Error("Thumbnail asset not found or has no URL")
      const imgRes = await fetch(imgAsset.url, { cache: "no-store" })
      if (!imgRes.ok) throw new Error(`Failed to fetch thumbnail (${imgRes.status})`)
      const rawBuf = Buffer.from(await imgRes.arrayBuffer())
      const pngBuf = await sharp(rawBuf)
        .resize(1920, 1080, { fit: "cover", position: "centre" })
        .png()
        .toBuffer()
      await writeFile(imagePath, pngBuf)
    } else {
      const pngBuf = await generatePlaceholder(opts.title, opts.producer, opts.accentColor)
      await writeFile(imagePath, pngBuf)
    }

    // 3 — Render with ffmpeg
    const outputPath = join(tmpDir, "output.mp4")
    await runFfmpeg(ffmpegPath, imagePath, audioPath, outputPath)

    // 4 — Read output
    const mp4Buffer = await readFile(outputPath)
    const sizeBytes  = mp4Buffer.length

    // 5 — Upload to Supabase storage
    const storagePath = `renders/${opts.jobId}.mp4`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, mp4Buffer, {
        contentType:  "video/mp4",
        cacheControl: "3600",
        upsert:       true,
      })
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    // 6 — Insert asset record
    const { data: assetRow, error: dbErr } = await supabase
      .from("assets")
      .insert({
        type:        "video",
        url:         publicUrl,
        filename:    `render_${opts.jobId}.mp4`,
        mime_type:   "video/mp4",
        size_bytes:  sizeBytes,
        alt_text:    opts.title,
        attached_to: null,
        uploaded_by: "render_engine",
      })
      .select("id")
      .single()

    if (dbErr) throw new Error(`Asset DB record failed: ${dbErr.message}`)

    const newAssetId = (assetRow as { id: string }).id

    // 7 — Update job: swap to rendered video asset, advance status
    const { data: sched } = await supabase
      .from("yt_upload_jobs")
      .select("scheduled_at")
      .eq("id", opts.jobId)
      .single()

    const newStatus = (sched as { scheduled_at: string | null } | null)?.scheduled_at
      ? "scheduled"
      : "pending"

    await supabase
      .from("yt_upload_jobs")
      .update({ asset_id: newAssetId, status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", opts.jobId)

    return { assetId: newAssetId, assetUrl: publicUrl, sizeBytes }
  } catch (err) {
    // Mark job failed so it surfaces in the engine page
    await supabase
      .from("yt_upload_jobs")
      .update({
        status:        "failed",
        error_message: `Render failed: ${err instanceof Error ? err.message : String(err)}`,
        updated_at:    new Date().toISOString(),
      })
      .eq("id", opts.jobId)
      .eq("status", "needs_render")

    throw err
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}
