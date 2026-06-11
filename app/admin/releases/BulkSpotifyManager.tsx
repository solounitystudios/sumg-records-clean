"use client"

import { useMemo, useState, useTransition } from "react"
import {
  backfillCoverArtFromSpotify,
  type BackfillCoverArtResult,
} from "@/app/actions/releases"

export interface BulkReleaseSummary {
  slug: string
  title: string
  artistName: string
  hasSpotify: boolean
  hasCover: boolean
}

export function BulkSpotifyManager({ releases }: { releases: BulkReleaseSummary[] }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<BackfillCoverArtResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)

  const missingSpotify = useMemo(() => releases.filter((r) => !r.hasSpotify), [releases])
  const missingCover = useMemo(() => releases.filter((r) => !r.hasCover), [releases])

  // Only releases that have a Spotify link can be backfilled from Spotify.
  const candidates = useMemo(
    () => missingCover.filter((r) => r.hasSpotify),
    [missingCover]
  )

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(candidates.map((r) => r.slug)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  function runSelected() {
    if (selected.size === 0) return
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await backfillCoverArtFromSpotify([...selected])
        setResult(res)
        setSelected(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Backfill failed.")
      }
    })
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/[0.08] bg-[#0a0c10] p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono">
          Bulk Management
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 hover:text-white/60 border border-white/[0.08] hover:border-white/20 px-3 py-1.5 rounded transition-all duration-150"
        >
          {expanded ? "Hide candidates" : "Select releases to backfill"}
        </button>
      </div>

      {/* Coverage counts */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Missing Spotify URL" value={missingSpotify.length} tone="text-amber-400" />
        <Tile label="Missing Cover Art" value={missingCover.length} tone="text-amber-400" />
        <Tile
          label="Backfillable from Spotify"
          value={candidates.length}
          tone="text-emerald-400"
        />
      </div>

      {/* Candidate selector */}
      {expanded && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          {candidates.length === 0 ? (
            <p className="text-[11px] font-mono text-white/30">
              No releases are missing cover art with a Spotify link to backfill from.
              {missingCover.length > candidates.length && (
                <>
                  {" "}
                  {missingCover.length - candidates.length} release(s) are missing cover art
                  but have no Spotify URL — link Spotify first.
                </>
              )}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/40 hover:text-white transition-colors duration-150"
                  >
                    Select all ({candidates.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/30 hover:text-white/60 transition-colors duration-150"
                  >
                    Clear
                  </button>
                </div>
                <button
                  type="button"
                  onClick={runSelected}
                  disabled={isPending || selected.size === 0}
                  className="rounded-full bg-white px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-black transition-all duration-150 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPending ? "Backfilling…" : `Backfill Selected (${selected.size})`}
                </button>
              </div>

              <ul className="space-y-1 max-h-72 overflow-y-auto">
                {candidates.map((r) => (
                  <li key={r.slug}>
                    <label className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.03] cursor-pointer transition-colors duration-150">
                      <input
                        type="checkbox"
                        checked={selected.has(r.slug)}
                        onChange={() => toggle(r.slug)}
                        className="accent-white"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm text-white/70 truncate block">{r.title}</span>
                        <span className="text-[10px] font-mono text-white/30 truncate block">
                          {r.artistName} · {r.slug}
                        </span>
                      </span>
                      <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-emerald-400/60 shrink-0">
                        Spotify linked
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[10px] font-mono text-red-400/70">{error}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/30 p-4">
          <div className="grid grid-cols-5 gap-2 text-[9px] font-mono uppercase tracking-[0.15em] text-center">
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

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5 font-mono">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums font-mono ${tone}`}>{value}</div>
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
