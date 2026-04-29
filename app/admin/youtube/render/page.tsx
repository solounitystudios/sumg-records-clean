import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getJobsNeedingRender, getJobsRendering } from "@/lib/db/youtube"
import { getAssets, formatBytes } from "@/lib/db/assets"
import { getAllPacks } from "@/lib/db/dnaPacks"
import { supabase } from "@/lib/db/supabase"
import { setJobThumbnail, requeueRenderJob, requeueAllFailedRenderJobs } from "@/app/actions/ytRender"
import { RenderSubmitButton } from "@/components/admin/RenderSubmitButton"

export const metadata = { title: "Render Pipeline — SUMG Admin" }

async function getWorkerStatus(): Promise<{ online: boolean; lastSeen: string | null }> {
  const { data } = await supabase
    .from("yt_engine_logs")
    .select("created_at")
    .ilike("message", "%render-worker%")
    .order("created_at", { ascending: false })
    .limit(1)

  const lastSeen = (data as Array<{ created_at: string }> | null)?.[0]?.created_at ?? null
  const online   = lastSeen ? Date.now() - new Date(lastSeen).getTime() < 3 * 60_000 : false
  return { online, lastSeen }
}

async function getRecentlyFailedRenderJobs() {
  const { data } = await supabase
    .from("yt_upload_jobs")
    .select("id, title, producer_slug, error_message, updated_at")
    .eq("status", "failed")
    .not("error_message", "is", null)
    .ilike("error_message", "Render failed:%")
    .order("updated_at", { ascending: false })
    .limit(10)
  return (data ?? []) as Array<{
    id: string
    title: string | null
    producer_slug: string
    error_message: string | null
    updated_at: string
  }>
}

export default async function RenderPage() {
  await requireAdmin()

  const [waiting, rendering, imageAssets, packs, workerStatus, failed] = await Promise.all([
    getJobsNeedingRender(),
    getJobsRendering(),
    getAssets("image"),
    getAllPacks(),
    getWorkerStatus(),
    getRecentlyFailedRenderJobs(),
  ])

  const packMap = Object.fromEntries(packs.map((p) => [p.id, p]))

  const workerAge = workerStatus.lastSeen
    ? Math.round((Date.now() - new Date(workerStatus.lastSeen).getTime()) / 60_000)
    : null

  return (
    <div className="px-6 py-8 max-w-4xl space-y-10">
      {/* Header */}
      <div>
        <Link href="/admin/youtube" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">Render Pipeline</h1>
        <p className="text-xs text-white/35 mt-1">
          External render worker converts audio + thumbnail into upload-ready MP4.
        </p>
      </div>

      {/* Worker status */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">Render Worker</p>
        <div className={`rounded-2xl border p-5 ${
          workerStatus.online
            ? "border-emerald-500/20 bg-emerald-500/[0.03]"
            : "border-yellow-500/20 bg-yellow-500/[0.03]"
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-2 h-2 rounded-full flex-none ${workerStatus.online ? "bg-emerald-400" : "bg-yellow-400"}`} />
            <p className={`text-sm font-medium ${workerStatus.online ? "text-emerald-400/90" : "text-yellow-400/90"}`}>
              {workerStatus.online
                ? "Worker online — renders will process automatically"
                : workerStatus.lastSeen
                ? `Worker offline — last seen ${workerAge}min ago`
                : "Worker not yet seen — deploy the render worker to process jobs"}
            </p>
          </div>

          {!workerStatus.online && (
            <div className="space-y-2 mt-3 border-t border-white/[0.06] pt-3">
              <p className="text-[11px] text-white/40">Deploy the render worker to process these jobs:</p>
              <div className="space-y-1 text-[10px] font-mono text-white/30">
                <p># Railway (recommended)</p>
                <p>cd worker</p>
                <p>railway init &amp;&amp; railway up</p>
                <p className="mt-2 font-sans text-white/25">Set env: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY</p>
                <p className="font-sans text-white/25">See <span className="font-mono">worker/.env.example</span> for all variables.</p>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-white/[0.06] pt-4 space-y-1 text-[11px] text-white/30 leading-relaxed">
            <p className="font-medium text-white/45 text-[10px] uppercase tracking-[0.15em]">How it works</p>
            <p>1. <strong className="text-white/50">Approve</strong> an inbox item → YT job created at <code className="font-mono">needs_render</code></p>
            <p>2. Optionally set a thumbnail image below — worker uses it or generates a placeholder</p>
            <p>3. Worker polls Supabase every 10s, claims job (<code className="font-mono">rendering</code>), runs ffmpeg, uploads MP4</p>
            <p>4. Job advances to <code className="font-mono">pending</code> → scheduler picks it up → <Link href="/admin/youtube/engine" className="underline underline-offset-2">Upload Engine</Link></p>
          </div>
        </div>
      </section>

      {/* Currently rendering */}
      {rendering.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">
            Currently Rendering
            <span className="ml-2 text-blue-400/70">{rendering.length}</span>
          </p>
          <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] overflow-hidden">
            {rendering.map((job, i) => (
              <div key={job.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${i < rendering.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-none" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/70 truncate">{job.title ?? job.assetFilename ?? "Untitled"}</p>
                  <p className="text-[10px] text-white/30">{job.producerSlug}</p>
                </div>
                <span className="text-[9px] font-mono text-blue-400/60">rendering…</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awaiting render */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">
          Awaiting Render
          {waiting.length > 0 && <span className="ml-2 text-orange-400/70">{waiting.length}</span>}
        </p>

        {waiting.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-12 text-center">
            <p className="text-sm text-white/25">No jobs queued for render.</p>
            <p className="text-[11px] text-white/15 mt-2">
              Approve inbox items to create render jobs.{" "}
              <Link href="/admin/youtube/inbox" className="underline underline-offset-2">Inbox →</Link>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            {waiting.map((job, i) => {
              const pack = job.dnaPackId ? packMap[job.dnaPackId] ?? null : null

              return (
                <div key={job.id}
                  className={`px-5 py-5 ${i < waiting.length - 1 ? "border-b border-white/[0.05]" : ""}`}>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] border border-orange-500/25 text-orange-400/70 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        queued
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

                    {pack?.thumbnail_prompt && (
                      <div className="mt-2 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                        <p className="text-[9px] uppercase tracking-[0.15em] text-white/20 mb-1">DNA Thumbnail Prompt</p>
                        <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">
                          {pack.thumbnail_prompt}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail config form (saves to DB for worker to use) */}
                  <form action={setJobThumbnail} className="space-y-3">
                    <input type="hidden" name="job_id" value={job.id} />

                    <div>
                      <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">
                        Thumbnail / Visual
                      </label>
                      <select
                        name="thumbnail_asset_id"
                        defaultValue={job.thumbnailAssetId ?? ""}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition appearance-none"
                      >
                        <option value="">Auto-generate placeholder (dark branded template)</option>
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
                        Worker picks this up on next poll. Leave blank for auto-generated 1920×1080 placeholder.
                      </p>
                    </div>

                    <RenderSubmitButton
                      label="Save Thumbnail Config"
                      pendingLabel="Saving…"
                    />
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Failed renders */}
      {failed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
              Failed Renders
              <span className="ml-2 text-red-400/70">{failed.length}</span>
            </p>
            {failed.length > 1 && (
              <form action={requeueAllFailedRenderJobs}>
                {failed.map((j) => (
                  <input key={j.id} type="hidden" name="job_id" value={j.id} />
                ))}
                <button type="submit"
                  className="text-[10px] border border-red-500/20 text-red-400/50 hover:border-red-500/40 hover:text-red-400/80 px-3 py-1.5 rounded-lg transition-colors">
                  Requeue All →
                </button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.02] overflow-hidden">
            {failed.map((job, i) => (
              <div key={job.id}
                className={`flex items-start gap-4 px-5 py-4 ${i < failed.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/65 truncate">{job.title ?? "Untitled"}</p>
                  <p className="text-[10px] text-red-400/60 mt-0.5 line-clamp-2 leading-relaxed">
                    {job.error_message}
                  </p>
                </div>
                <form action={requeueRenderJob} className="flex-none">
                  <input type="hidden" name="job_id" value={job.id} />
                  <button type="submit"
                    className="text-[9px] border border-white/10 text-white/30 hover:border-white/25 hover:text-white/60 px-2.5 py-1.5 rounded-lg transition-colors">
                    Requeue
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick links */}
      <div className="flex gap-4 text-[10px] text-white/25">
        <Link href="/admin/youtube/queue"  className="hover:text-white/50 transition-colors">← Queue</Link>
        <Link href="/admin/youtube/engine" className="hover:text-white/50 transition-colors">Upload Engine →</Link>
        <Link href="/admin/assets"         className="hover:text-white/50 transition-colors">Asset Bin →</Link>
      </div>
    </div>
  )
}
