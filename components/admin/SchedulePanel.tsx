"use client"

import { useState, useTransition } from "react"
import { scheduleAllChannelsAction, scheduleChannelAction } from "@/app/actions/ytScheduler"
import type { AutoScheduleResult, SchedulerSummary } from "@/app/actions/ytScheduler"

// ─── Auto-Schedule All ────────────────────────────────────────────────────────

export function ScheduleAllPanel() {
  const [isPending, startTransition] = useTransition()
  const [summary, setSummary]        = useState<SchedulerSummary | null>(null)
  const [err, setErr]                = useState<string | null>(null)

  function handleScheduleAll() {
    setErr(null)
    startTransition(async () => {
      try {
        const result = await scheduleAllChannelsAction()
        setSummary(result)
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Schedule failed")
      }
    })
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleScheduleAll}
        disabled={isPending}
        className="rounded-full border border-sky-500/30 bg-sky-500/10 px-6 py-2.5 text-[13px] font-medium text-sky-400 hover:bg-sky-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {isPending ? "Scheduling…" : "Auto-Schedule All Channels"}
      </button>

      {err && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-[11px] text-red-400/80">{err}</p>
        </div>
      )}

      {summary && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 space-y-4">
          <div className="flex gap-8">
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/25 mb-1">Channels</p>
              <p className="text-xl font-semibold tabular-nums">{summary.channels}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/25 mb-1">Scheduled</p>
              <p className={`text-xl font-semibold tabular-nums ${summary.totalScheduled > 0 ? "text-sky-400" : ""}`}>
                {summary.totalScheduled}
              </p>
            </div>
          </div>

          {summary.results.length > 0 && (
            <div className="space-y-1.5 border-t border-white/[0.05] pt-4">
              {summary.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-white/50 truncate">{r.handle ?? r.channelDbId}</span>
                  {r.scheduled > 0 ? (
                    <span className="text-[10px] text-sky-400/70 flex-none">+{r.scheduled} scheduled</span>
                  ) : (
                    <span className="text-[10px] text-white/20 flex-none">{r.skippedReason ?? "skipped"}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Per-channel schedule button ──────────────────────────────────────────────

export function ScheduleChannelButton({ channelId, disabled }: { channelId: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult]          = useState<AutoScheduleResult | null>(null)
  const [err, setErr]                = useState<string | null>(null)

  function handleSchedule() {
    setErr(null)
    setResult(null)
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set("channel_id", channelId)
        const r = await scheduleChannelAction(fd)
        setResult(r)
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed")
      }
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handleSchedule}
        disabled={isPending || disabled}
        className="text-[10px] border border-sky-500/20 text-sky-400/60 hover:border-sky-500/40 hover:text-sky-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {isPending ? "…" : "Auto-Schedule →"}
      </button>

      {result && result.scheduled > 0 && (
        <span className="text-[10px] text-sky-400/70">+{result.scheduled} scheduled</span>
      )}
      {result && result.scheduled === 0 && (
        <span className="text-[10px] text-white/25">{result.skippedReason ?? "nothing to schedule"}</span>
      )}
      {err && (
        <span className="text-[10px] text-red-400/60">{err}</span>
      )}
    </div>
  )
}
