"use client"

import type { UploadJobForStudio } from "@/lib/youtube/thumbnails/types"

const STATUS_DOT: Record<string, string> = {
  approved: "bg-emerald-400",
  skipped:  "bg-white/20",
  pending:  "bg-amber-400",
  draft:    "bg-violet-400",
}

const MODE_LABEL: Record<string, string> = {
  auto:      "Auto",
  generated: "Generated",
  edited:    "Edited",
  custom:    "Custom",
}

interface Props {
  jobs: UploadJobForStudio[]
  selectedJobId: string | null
  onSelect: (job: UploadJobForStudio) => void
}

export function ThumbnailQueue({ jobs, selectedJobId, onSelect }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="p-4 text-center text-white/30 text-xs">
        No active jobs found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 min-h-0">
      {jobs.map((job) => {
        const isSelected = job.id === selectedJobId
        const thumbStatus = job.thumbnail_status ?? "pending"
        const dot = STATUS_DOT[thumbStatus] ?? "bg-white/20"

        return (
          <button
            type="button"
            key={job.id}
            onClick={() => onSelect(job)}
            className={`w-full text-left px-4 py-3 border-l-2 transition-colors duration-150 ${
              isSelected
                ? "bg-white/[0.07] border-violet-500/60 text-white"
                : "bg-transparent border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/80"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${dot}`} />
              <div className="min-w-0">
                <p className="text-[12px] font-medium truncate">
                  {job.title ?? "Untitled"}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5 truncate">
                  {job.producer_slug ?? "No producer"} · {job.status}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] uppercase tracking-wide text-white/25">
                    {MODE_LABEL[job.thumbnail_mode ?? "auto"] ?? "Auto"}
                  </span>
                  {thumbStatus === "approved" && (
                    <span className="text-[9px] text-emerald-400/80">✓ approved</span>
                  )}
                  {thumbStatus === "skipped" && (
                    <span className="text-[9px] text-white/25">skipped</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
