import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getJobsNeedingRender } from "@/lib/db/youtube"
import { getAssets } from "@/lib/db/assets"
import { getAllPacks } from "@/lib/db/dnaPacks"
import { isFfmpegAvailable, getFfmpegPath, getDeploymentOptions } from "@/lib/youtube/renderer"
import { formatBytes } from "@/lib/db/assets"
import { renderJob, renderAllJobs } from "@/app/actions/ytRender"
import { RenderSubmitButton } from "@/components/admin/RenderSubmitButton"

export const metadata = { title: "Render Pipeline — SUMG Admin" }

export default async function RenderPage() {
  await requireAdmin()

  const ffmpegAvailable = isFfmpegAvailable()
  const ffmpegPath      = getFfmpegPath()
  const deployOptions   = getDeploymentOptions()

  const [jobs, imageAssets, packs] = await Promise.all([
    getJobsNeedingRender(),
    getAssets("image"),
    getAllPacks(),
  ])

  const packMap = Object.fromEntries(packs.map((p) => [p.id, p]))

  return (
    <div className="px-6 py-8 max-w-4xl space-y-10">
      {/* Header */}
      <div>
        <Link href="/admin/youtube" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">Render Pipeline</h1>
        <p className="text-xs text-white/35 mt-1">
          Convert audio assets into upload-ready MP4 videos.
        </p>
      </div>

      {/* FFmpeg status */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">Render Engine</p>
        <div className={`rounded-2xl border p-5 ${ffmpegAvailable
          ? "border-green-500/20 bg-green-500/5"
          : "border-yellow-500/20 bg-yellow-500/5"
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-2 h-2 rounded-full flex-none ${ffmpegAvailable ? "bg-green-400" : "bg-yellow-400"}`} />
            <p className={`text-sm font-medium ${ffmpegAvailable ? "text-green-400/90" : "text-yellow-400/90"}`}>
              {ffmpegAvailable ? "ffmpeg available — renders enabled" : "ffmpeg not found — set FFMPEG_PATH to enable"}
            </p>
          </div>

          {ffmpegAvailable && (
            <p className="text-[10px] font-mono text-white/35">{ffmpegPath}</p>
          )}

          {!ffmpegAvailable && (
            <div className="space-y-3">
              <p className="text-[11px] text-white/40 leading-relaxed">
                ffmpeg is required to combine audio + visual into MP4.
                Set <code className="font-mono text-white/60">FFMPEG_PATH</code> or install system-wide:
              </p>
              <div className="space-y-1.5">
                {deployOptions.map((opt, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[9px] text-yellow-400/50 mt-0.5 flex-none">{i + 1}.</span>
                    <p className="text-[10px] text-white/35 leading-relaxed">{opt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-white/[0.06] pt-4 space-y-1.5 text-[11px] text-white/30 leading-relaxed">
            <p className="font-medium text-white/45 text-[10px] uppercase tracking-[0.15em]">Render workflow</p>
            <p>1. Assign an <strong className="text-white/50">audio asset</strong> to a job → status becomes <code className="font-mono text-white/50">needs_render</code></p>
            <p>2. Come here, pick a <strong className="text-white/50">thumbnail image</strong> or use the auto-generated placeholder</p>
            <p>3. Click <strong className="text-white/50">Render MP4 →</strong> — ffmpeg combines image + audio into a 1920×1080 video</p>
            <p>4. The rendered MP4 uploads to Supabase storage and the job advances to <code className="font-mono text-white/50">pending</code></p>
            <p>5. The <Link href="/admin/youtube/engine" className="underline underline-offset-2 hover:text-white/50">Upload Engine</Link> picks it up and uploads to YouTube</p>
          </div>
        </div>
      </section>

      {/* Jobs needing render */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
            Awaiting Render
            {jobs.length > 0 && <span className="ml-2 text-orange-400/70">{jobs.length}</span>}
          </p>
          {jobs.length > 1 && ffmpegAvailable && (
            <form action={renderAllJobs}>
              {jobs.map((j) => (
                <input key={j.id} type="hidden" name="job_id" value={j.id} />
              ))}
              <button type="submit"
                className="text-[10px] border border-orange-500/20 text-orange-400/50 hover:border-orange-500/40 hover:text-orange-400/80 px-3 py-1.5 rounded-lg transition-colors">
                Render All ({jobs.length}) →
              </button>
            </form>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-12 text-center">
            <p className="text-sm text-white/25">No jobs awaiting render.</p>
            <p className="text-[11px] text-white/15 mt-2">
              Assign an audio asset to a queue job to create a render task.{" "}
              <Link href="/admin/youtube/queue" className="underline underline-offset-2">View queue →</Link>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            {jobs.map((job, i) => {
              const pack = job.dnaPackId ? packMap[job.dnaPackId] ?? null : null

              return (
                <div key={job.id}
                  className={`px-5 py-5 ${i < jobs.length - 1 ? "border-b border-white/[0.05]" : ""}`}>

                  {/* Job header */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] border border-orange-500/25 text-orange-400/70 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        needs render
                      </span>
                      <p className="text-sm font-medium text-white/75 truncate">
                        {job.title ?? job.assetFilename ?? "Untitled"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/30">
                      <span>{job.producerSlug}</span>
                      {job.assetFilename && (
                        <>
                          <span className="text-white/15">·</span>
                          <span className="font-mono">{job.assetFilename}</span>
                        </>
                      )}
                      {job.channelHandle && (
                        <>
                          <span className="text-white/15">·</span>
                          <span>{job.channelHandle}</span>
                        </>
                      )}
                    </div>

                    {/* DNA pack thumbnail prompt if linked */}
                    {pack?.thumbnail_prompt && (
                      <div className="mt-2 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-[0.15em] text-white/20 mb-1">DNA Thumbnail Prompt</p>
                        <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">
                          {pack.thumbnail_prompt}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Render form */}
                  <form action={renderJob} className="space-y-3">
                    <input type="hidden" name="job_id" value={job.id} />

                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">
                        Thumbnail / Visual
                      </label>
                      <select
                        name="thumbnail_asset_id"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition appearance-none"
                      >
                        <option value="">Auto-generate placeholder (dark template)</option>
                        {imageAssets.length > 0 && (
                          <optgroup label="Image assets">
                            {imageAssets.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.filename}
                                {a.size_bytes ? ` · ${formatBytes(a.size_bytes)}` : ""}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <p className="mt-1 text-[9px] text-white/20">
                        Auto-generate creates a branded 1920×1080 frame with the track title and producer name.
                      </p>
                    </div>

                    <RenderSubmitButton disabled={!ffmpegAvailable} />
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Quick links */}
      <div className="flex gap-4 text-[10px] text-white/25">
        <Link href="/admin/youtube/queue"  className="hover:text-white/50 transition-colors">← Queue</Link>
        <Link href="/admin/youtube/engine" className="hover:text-white/50 transition-colors">Upload Engine →</Link>
        <Link href="/admin/assets"         className="hover:text-white/50 transition-colors">Asset Bin →</Link>
      </div>
    </div>
  )
}
