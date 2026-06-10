"use client"

import { useState, useTransition } from "react"
import {
  backfillCoverArtFromSpotify,
  type BackfillCoverArtResult,
} from "@/app/actions/releases"

export function BackfillCoverArtButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<BackfillCoverArtResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function run() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await backfillCoverArtFromSpotify()
        setResult(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Backfill failed.")
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="shrink-0 rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 transition-all duration-150 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Backfilling…" : "Backfill Cover Art from Spotify"}
      </button>

      {error && (
        <p className="text-[10px] font-mono text-red-400/70">{error}</p>
      )}

      {result && (
        <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0a0c10] p-4 text-right">
          <div className="grid grid-cols-5 gap-2 text-[9px] font-mono uppercase tracking-[0.15em]">
            <Stat label="Checked" value={result.totalChecked} tone="text-white/60" />
            <Stat label="Updated" value={result.updated} tone="text-emerald-400" />
            <Stat label="Skipped" value={result.skipped} tone="text-white/35" />
            <Stat label="Failed" value={result.failed} tone="text-red-400/70" />
            <Stat label="Errors" value={result.errors.length} tone="text-amber-400/70" />
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-left text-[9px] font-mono text-white/40">
              {result.errors.map((e) => (
                <li key={e.slug}>
                  <span className="text-white/60">{e.slug}</span>: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="text-white/25">{label}</div>
      <div className={`mt-1 text-base tabular-nums ${tone}`}>{value}</div>
    </div>
  )
}
