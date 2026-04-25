import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getAllJobs, getJobCounts } from "@/lib/db/youtube"
import { getProducers } from "@/lib/db/producers"
import { getAllPacks } from "@/lib/db/dnaPacks"

export const metadata = { title: "Upload Jobs — SUMG Admin" }

const STATUS_STYLE: Record<string, string> = {
  needs_asset: "text-orange-400/60 border-orange-500/20",
  scheduled:   "text-violet-400/60 border-violet-500/20",
  pending:     "text-yellow-400/60 border-yellow-500/20",
  processing:  "text-sky-400/60 border-sky-500/20",
  uploaded:    "text-green-400/60 border-green-500/20",
  failed:      "text-red-400/60 border-red-500/20",
  cancelled:   "text-white/25 border-white/10",
}

export default async function UploadJobsPage() {
  await requireAdmin()
  const [jobs, counts, producers, packs] = await Promise.all([
    getAllJobs(200),
    getJobCounts(),
    getProducers(),
    getAllPacks(),
  ])

  const producerMap = Object.fromEntries(producers.map((p) => [p.slug, p.name]))
  const packMap     = Object.fromEntries(packs.map((p) => [p.id, p]))

  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <Link href="/admin/youtube" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">Upload Jobs</h1>
        <p className="text-xs text-white/35 mt-1">Full job history — last 200 records</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-3 mb-8">
        {(["needs_asset", "scheduled", "pending", "processing", "uploaded", "failed", "cancelled"] as const).map((s) => (
          <div key={s} className={`border rounded-xl px-3 py-3 ${STATUS_STYLE[s]}`}>
            <p className="text-[9px] uppercase tracking-[0.12em] opacity-70 mb-1 truncate">{s.replace("_", " ")}</p>
            <p className="text-xl font-semibold tabular-nums">{counts[s]}</p>
          </div>
        ))}
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-white/25 py-12 text-center">No jobs yet.</p>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.05]">
            {["Status", "Title / File", "Producer", "Channel", "Date"].map((h) => (
              <p key={h} className="text-[9px] uppercase tracking-[0.15em] text-white/25">{h}</p>
            ))}
          </div>

          {jobs.map((job, i) => (
            <div key={job.id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 ${i < jobs.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
              {/* Status */}
              <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide whitespace-nowrap ${STATUS_STYLE[job.status]}`}>
                {job.status}
              </span>

              {/* Title */}
              <div className="min-w-0">
                <p className="text-sm text-white/65 truncate">
                  {job.title ?? job.assetFilename ?? job.assetId ?? "Untitled"}
                </p>
                {job.dnaPackId && packMap[job.dnaPackId] && (
                  <p className="text-[10px] text-white/30 truncate mt-0.5">
                    <span className="text-white/20">DNA: </span>
                    {packMap[job.dnaPackId].title}
                  </p>
                )}
                {job.ytVideoId && (
                  <p className="text-[10px] text-white/25 font-mono truncate mt-0.5">{job.ytVideoId}</p>
                )}
                {job.errorMessage && (
                  <p className="text-[10px] text-red-400/50 truncate mt-0.5">{job.errorMessage}</p>
                )}
              </div>

              {/* Producer */}
              <p className="text-[10px] text-white/30 whitespace-nowrap">
                {producerMap[job.producerSlug] ?? job.producerSlug}
              </p>

              {/* Channel */}
              <p className="text-[10px] text-white/25 font-mono whitespace-nowrap">
                {job.channelHandle ?? "—"}
              </p>

              {/* Date */}
              <p className="text-[10px] text-white/20 font-mono whitespace-nowrap">
                {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
