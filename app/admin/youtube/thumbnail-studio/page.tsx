import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getJobsForStudio } from "@/lib/youtube/thumbnails/actions"
import { ThumbnailStudioClient } from "./ThumbnailStudioClient"

export const metadata = { title: "Thumbnail Studio — SUMG Admin" }

export default async function ThumbnailStudioPage() {
  await requireAdmin()

  const jobs = await getJobsForStudio()

  const approved = jobs.filter((j) => j.thumbnail_status === "approved").length
  const pending  = jobs.filter((j) => !j.thumbnail_status || j.thumbnail_status === "pending").length

  return (
    <div className="px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/youtube"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← YouTube Automation
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Thumbnail Studio</h1>
            <p className="text-xs text-white/35 mt-1">
              {jobs.length} jobs · {approved} approved · {pending} pending
            </p>
          </div>
          <Link
            href="/admin/youtube/jobs"
            className="text-[11px] border border-white/20 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:border-white/35 transition-colors whitespace-nowrap"
          >
            View All Jobs →
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Jobs",  count: jobs.length,   color: "text-white/60" },
          { label: "Approved",    count: approved,       color: "text-emerald-400" },
          { label: "Pending",     count: pending,        color: "text-amber-400" },
          { label: "Skipped",     count: jobs.filter((j) => j.thumbnail_status === "skipped").length, color: "text-white/30" },
        ].map(({ label, count, color }) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-4 py-3">
            <p className={`text-2xl font-semibold tabular-nums ${color}`}>{count}</p>
            <p className="text-[9px] text-white/25 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline reference */}
      <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 overflow-x-auto">
        <div className="flex items-center gap-2 text-[9px] text-white/30 whitespace-nowrap min-w-max">
          {[
            "inbox",
            "→ assign",
            "→ metadata",
            "→ thumbnail studio",
            "→ approve",
            "→ render",
            "→ schedule",
            "→ upload",
          ].map((step, i) => (
            <span
              key={i}
              className={`${
                step === "→ thumbnail studio"
                  ? "text-violet-400 font-medium"
                  : step.startsWith("→")
                  ? "text-white/15"
                  : "text-white/40 font-medium"
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Studio */}
      <ThumbnailStudioClient initialJobs={jobs} />
    </div>
  )
}
