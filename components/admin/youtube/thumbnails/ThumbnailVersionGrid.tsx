"use client"

import { useTransition } from "react"
import { selectVersion, rejectVersion } from "@/lib/youtube/thumbnails/actions"
import type { ThumbnailVersion } from "@/lib/youtube/thumbnails/types"

interface Props {
  projectId:         string
  versions:          ThumbnailVersion[]
  selectedVersionId: string | null
  generatingCount?:  number
  mjPending?:        boolean
  onVersionsChange:  (versions: ThumbnailVersion[]) => void
  onVersionSelect:   (version: ThumbnailVersion) => void
  onApprove?:        (version: ThumbnailVersion) => void
}

export function ThumbnailVersionGrid({
  projectId,
  versions,
  selectedVersionId,
  generatingCount = 0,
  mjPending = false,
  onVersionsChange,
  onVersionSelect,
  onApprove,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const active   = versions.filter((v) => !v.rejected)
  const rejected = versions.filter((v) => v.rejected)
  const totalCards = active.length + generatingCount + (mjPending ? 2 : 0)

  function handleSelect(v: ThumbnailVersion) {
    startTransition(async () => {
      await selectVersion(projectId, v.id)
      onVersionSelect(v)
      onVersionsChange(versions.map((ver) => ({ ...ver, selected: ver.id === v.id })))
    })
  }

  function handleReject(v: ThumbnailVersion) {
    startTransition(async () => {
      await rejectVersion(v.id)
      onVersionsChange(versions.map((ver) =>
        ver.id === v.id ? { ...ver, rejected: true, selected: false } : ver
      ))
    })
  }

  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-14 h-9 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center mb-4">
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none" className="text-white/15" aria-hidden="true">
            <rect x="0.5" y="0.5" width="17" height="11" rx="1.5" stroke="currentColor" />
            <path d="M6.5 3.5L11.5 6L6.5 8.5V3.5Z" fill="currentColor" />
          </svg>
        </div>
        <p className="text-sm text-white/25">No versions yet</p>
        <p className="text-xs text-white/15 mt-1">Use the generate buttons below to create thumbnails</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">
          Versions{active.length > 0 ? ` · ${active.length}` : ""}
        </p>
        {rejected.length > 0 && (
          <p className="text-[9px] text-white/20">{rejected.length} removed</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">

        {/* Actual version cards */}
        {active.map((v) => {
          const isSelected = v.id === selectedVersionId
          return (
            <div
              key={v.id}
              className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${
                isSelected
                  ? "ring-2 ring-violet-500/60 shadow-[0_0_0_1px_rgba(139,92,246,0.4),0_0_24px_rgba(139,92,246,0.12)]"
                  : "ring-1 ring-white/[0.06] hover:ring-white/[0.15]"
              }`}
              onClick={() => handleSelect(v)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-[#0a0c11]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.image_url}
                  alt={`v${v.version_number}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Hover action overlay */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2.5">
                {onApprove && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onApprove(v) }}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 active:scale-95 text-white transition-all"
                    title="Approve this version"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[9px] font-semibold">Approve</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleReject(v) }}
                  disabled={isPending}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-red-500/70 active:scale-95 text-white/70 hover:text-white transition-all disabled:opacity-40"
                  title="Remove this version"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span className="text-[9px] font-semibold">Remove</span>
                </button>
              </div>

              {/* Bottom info bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2.5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/35 font-mono">v{v.version_number}</span>
                  <div className="flex items-center gap-1">
                    {v.provider === "openai" && (
                      <span className="text-[8px] bg-violet-600/50 text-violet-200 px-1.5 py-0.5 rounded-md font-mono">AI</span>
                    )}
                    {v.provider === "midjourney" && (
                      <span className="text-[8px] bg-sky-600/50 text-sky-200 px-1.5 py-0.5 rounded-md font-mono">MJ</span>
                    )}
                    {isSelected && (
                      <span className="text-[8px] bg-violet-500/70 text-white px-1.5 py-0.5 rounded-md font-semibold">selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* OpenAI skeleton cards */}
        {generatingCount > 0 && Array.from({ length: generatingCount }).map((_, i) => (
          <div key={`gen-${i}`} className="aspect-video rounded-xl ring-1 ring-violet-500/20 bg-violet-500/[0.04] animate-pulse flex flex-col items-center justify-center gap-2">
            <svg className="w-4 h-4 text-violet-400/40 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-[9px] text-violet-400/40">Generating…</span>
          </div>
        ))}

        {/* Midjourney skeleton cards */}
        {mjPending && [0, 1].map((i) => (
          <div key={`mj-${i}`} className="aspect-video rounded-xl ring-1 ring-sky-500/20 bg-sky-500/[0.04] animate-pulse flex flex-col items-center justify-center gap-2">
            <svg className="w-4 h-4 text-sky-400/40 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-[9px] text-sky-400/40">Midjourney…</span>
          </div>
        ))}

      </div>
    </div>
  )
}
