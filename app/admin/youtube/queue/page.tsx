import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getQueuedJobs, getAllChannels } from "@/lib/db/youtube"
import { getProducers } from "@/lib/db/producers"
import { getAssets } from "@/lib/db/assets"
import { getAllPacks } from "@/lib/db/dnaPacks"
import { createYtJob, cancelYtJob } from "@/app/actions/youtube"

export const metadata = { title: "Upload Queue — SUMG Admin" }

const input =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1.5"

const STATUS_STYLE: Record<string, string> = {
  needs_asset: "text-orange-400/80 border-orange-500/30 bg-orange-400/5",
  scheduled:   "text-violet-400/80 border-violet-500/30 bg-violet-400/5",
  pending:     "text-yellow-400/70 border-yellow-500/25 bg-yellow-400/5",
  processing:  "text-sky-400/70 border-sky-500/25 bg-sky-400/5",
}

const STATUS_LABEL: Record<string, string> = {
  needs_asset: "needs asset",
  scheduled:   "scheduled",
  pending:     "pending",
  processing:  "processing",
}

const CANCELLABLE = new Set(["needs_asset", "scheduled", "pending"])

export default async function UploadQueuePage() {
  await requireAdmin()
  const [jobs, channels, producers, audioAssets, packs] = await Promise.all([
    getQueuedJobs(),
    getAllChannels(),
    getProducers(),
    getAssets("audio"),
    getAllPacks(),
  ])

  const activeChannels = channels.filter((c) => c.status === "active")
  const producerMap    = Object.fromEntries(producers.map((p) => [p.slug, p.name]))
  const packMap        = Object.fromEntries(packs.map((p) => [p.id, p]))

  const needsAsset = jobs.filter((j) => j.status === "needs_asset").length
  const scheduled  = jobs.filter((j) => j.status === "scheduled").length
  const active     = jobs.filter((j) => j.status === "pending" || j.status === "processing").length

  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <Link href="/admin/youtube" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">Upload Queue</h1>
        <p className="text-xs text-white/35 mt-1">{jobs.length} job{jobs.length !== 1 ? "s" : ""} in queue</p>
      </div>

      {/* Status breakdown */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Needs Asset", count: needsAsset, style: "text-orange-400" },
            { label: "Scheduled",   count: scheduled,  style: "text-violet-400" },
            { label: "Active",      count: active,     style: "text-yellow-400" },
          ].map(({ label, count, style }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#0d1016] px-4 py-3">
              <p className={`text-xl font-semibold tabular-nums ${style}`}>{count}</p>
              <p className="text-[9px] text-white/25 uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Queue list */}
        <div>
          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-12 text-center">
              <p className="text-sm text-white/25">Queue is empty.</p>
              <p className="text-[11px] text-white/15 mt-2">
                Add a job manually, or{" "}
                <Link href="/admin/dna/packs" className="underline underline-offset-2">approve a DNA pack →</Link>
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
              {jobs.map((job, i) => {
                const linkedPack = job.dnaPackId ? packMap[job.dnaPackId] : null
                return (
                  <div key={job.id}
                    className={`px-5 py-4 ${i < jobs.length - 1 ? "border-b border-white/[0.05]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Status + title row */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide flex-none ${STATUS_STYLE[job.status] ?? "text-white/30 border-white/10"}`}>
                            {STATUS_LABEL[job.status] ?? job.status}
                          </span>
                          <p className="text-sm font-medium text-white/75 truncate">
                            {job.title ?? job.assetFilename ?? job.assetId ?? "Untitled"}
                          </p>
                        </div>

                        {/* Producer + channel */}
                        <p className="text-[10px] text-white/30">
                          {producerMap[job.producerSlug] ?? job.producerSlug}
                          {job.channelHandle && ` · ${job.channelHandle}`}
                          {!job.ytChannelId && (
                            <span className="ml-1 text-orange-400/50">· no channel</span>
                          )}
                        </p>

                        {/* DNA pack badge */}
                        {linkedPack && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[8px] uppercase tracking-[0.2em] text-white/20 border border-white/[0.07] px-1.5 py-0.5 rounded">
                              DNA Pack
                            </span>
                            <Link
                              href="/admin/dna/packs"
                              className="text-[10px] text-white/35 hover:text-white/65 transition-colors truncate"
                            >
                              {linkedPack.title}
                            </Link>
                          </div>
                        )}

                        {/* Scheduled time */}
                        {job.scheduledAt && (
                          <p className="text-[10px] text-white/20 font-mono mt-0.5">
                            Scheduled: {new Date(job.scheduledAt).toLocaleString()}
                          </p>
                        )}

                        {/* Needs asset hint */}
                        {job.status === "needs_asset" && (
                          <p className="text-[10px] text-orange-400/50 mt-0.5">
                            Assign an audio asset to activate this job.
                          </p>
                        )}
                      </div>

                      {CANCELLABLE.has(job.status) && (
                        <form action={cancelYtJob} className="flex-none">
                          <input type="hidden" name="id" value={job.id} />
                          <button type="submit"
                            className="text-[10px] border border-red-500/20 text-red-400/50 px-3 py-1.5 hover:border-red-500/40 hover:text-red-400 transition-colors rounded-lg">
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* New job form (manual) */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 self-start">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1">Schedule Upload</p>
          <p className="text-[10px] text-white/20 mb-5">
            Manual entry — or{" "}
            <Link href="/admin/dna/packs" className="underline underline-offset-2 hover:text-white/40 transition-colors">
              create from DNA pack →
            </Link>
          </p>

          {activeChannels.length === 0 ? (
            <p className="text-xs text-white/30">
              No active channels.{" "}
              <Link href="/admin/youtube/channels" className="underline underline-offset-2">Add one first →</Link>
            </p>
          ) : (
            <form action={createYtJob} className="space-y-4">
              <div>
                <label htmlFor="job-producer" className={labelClass}>Producer *</label>
                <select id="job-producer" name="producer_slug" required className={input}>
                  <option value="">Select producer…</option>
                  {producers.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="job-channel" className={labelClass}>Channel *</label>
                <select id="job-channel" name="yt_channel_id" required className={input}>
                  <option value="">Select channel…</option>
                  {activeChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.channelHandle ?? ch.channelId} ({producerMap[ch.producerSlug] ?? ch.producerSlug})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="job-asset" className={labelClass}>Audio Asset *</label>
                <select id="job-asset" name="asset_id" required className={input}>
                  <option value="">Select audio file…</option>
                  {audioAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.filename}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="job-title" className={labelClass}>Title</label>
                <input id="job-title" name="title" type="text" placeholder="Override title…" className={input} />
              </div>
              <div>
                <label htmlFor="job-scheduled" className={labelClass}>Schedule At</label>
                <input id="job-scheduled" name="scheduled_at" type="datetime-local" className={input} />
              </div>
              <div>
                <label htmlFor="job-tags" className={labelClass}>Tags Override</label>
                <textarea id="job-tags" name="tags" rows={3}
                  placeholder={"type beat\nhip hop"}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-y" />
              </div>
              <button type="submit"
                className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 transition">
                Add to Queue
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
