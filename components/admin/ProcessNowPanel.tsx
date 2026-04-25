"use client"

import { useState, useTransition } from "react"
import { triggerProcessing } from "@/app/actions/ytEngine"
import type { ProcessSummary } from "@/lib/youtube/types"

const STATUS_STYLE = {
  uploaded: "text-green-400/70 border-green-500/25",
  failed:   "text-red-400/60 border-red-500/20",
  skipped:  "text-white/30 border-white/10",
}

export function ProcessNowPanel({
  readyCount,
  safeMode,
}: {
  readyCount: number
  safeMode:   boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [summary, setSummary] = useState<ProcessSummary | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  function handleProcess() {
    setRunError(null)
    startTransition(async () => {
      try {
        const result = await triggerProcessing()
        setSummary(result)
      } catch (err) {
        setRunError(err instanceof Error ? err.message : "Processor error")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleProcess}
          disabled={isPending || readyCount === 0}
          className="rounded-full bg-red-500 px-6 py-2.5 text-[13px] font-medium text-white hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Processing…" : `Process Now — ${readyCount} job${readyCount !== 1 ? "s" : ""} ready`}
        </button>

        {safeMode && (
          <span className="text-[10px] text-yellow-400/80 border border-yellow-500/25 bg-yellow-500/5 px-2.5 py-1 rounded-lg">
            Safe Mode — no real uploads
          </span>
        )}

        {readyCount === 0 && !isPending && (
          <span className="text-[11px] text-white/25">No pending jobs ready to process</span>
        )}
      </div>

      {runError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-[11px] text-red-400/80">{runError}</p>
        </div>
      )}

      {summary && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Last Run</p>
            {summary.safeMode && (
              <span className="text-[9px] text-yellow-400/60 border border-yellow-500/20 px-1.5 py-0.5 rounded uppercase tracking-wide">
                Simulated
              </span>
            )}
          </div>

          <div className="flex gap-8 mb-5">
            {[
              { label: "Processed", value: summary.processed, cls: "" },
              { label: "Uploaded",  value: summary.uploaded,  cls: summary.uploaded  > 0 ? "text-green-400" : "" },
              { label: "Failed",    value: summary.failed,    cls: summary.failed    > 0 ? "text-red-400"   : "" },
              { label: "Skipped",   value: summary.skipped,   cls: "text-white/40" },
            ].map(({ label, value, cls }) => (
              <div key={label}>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/25 mb-1">{label}</p>
                <p className={`text-xl font-semibold tabular-nums ${cls}`}>{value}</p>
              </div>
            ))}
          </div>

          {summary.results.length === 0 ? (
            <p className="text-[11px] text-white/25">No jobs were ready to process.</p>
          ) : (
            <div className="space-y-2.5">
              {summary.results.map((r) => (
                <div key={r.jobId} className="flex items-start gap-3">
                  <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide flex-none mt-0.5 ${STATUS_STYLE[r.status]}`}>
                    {r.status}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/60 truncate">{r.title}</p>
                    {r.videoUrl && (
                      <a href={r.videoUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-red-400/60 hover:text-red-400 font-mono block truncate transition-colors">
                        {r.videoUrl}
                      </a>
                    )}
                    {r.error && (
                      <p className="text-[10px] text-red-400/50 truncate">{r.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
