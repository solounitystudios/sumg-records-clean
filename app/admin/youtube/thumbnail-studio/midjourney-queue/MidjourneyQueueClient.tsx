"use client"

import { useState, useRef } from "react"
import type { MidjourneyQueueRow } from "@/lib/youtube/thumbnails/types"
import {
  completeMidjourneyAsset,
  markMidjourneyFailed,
  deleteGenerationJob,
} from "@/lib/youtube/thumbnails/actions"

type StatusFilter = "all" | "pending" | "complete" | "failed"

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-amber-400/20 text-amber-300 border-amber-400/30",
  complete: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
  failed:   "bg-red-400/20 text-red-300 border-red-400/30",
}

function isValidHttpImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

interface RowProps {
  item: MidjourneyQueueRow
  onUpdate: (id: string, patch: Partial<MidjourneyQueueRow>) => void
  onRemove: (id: string) => void
}

function QueueRow({ item, onUpdate, onRemove }: RowProps) {
  const [urlInput,    setUrlInput]    = useState("")
  const [urlWarn,     setUrlWarn]     = useState<string | null>(null)
  const [completing,  setCompleting]  = useState(false)
  const [marking,     setMarking]     = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [rowError,    setRowError]    = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleCompleteByUrl() {
    const url = urlInput.trim()
    if (!url) return
    if (!isValidHttpImageUrl(url)) {
      setUrlWarn("Paste a direct image URL (https://…), not a prompt text.")
      return
    }
    setUrlWarn(null)
    setCompleting(true)
    setRowError(null)
    const result = await completeMidjourneyAsset({
      id:           item.id,
      imageUrl:     url,
      producerSlug: item.producer_slug ?? undefined,
    })
    setCompleting(false)
    if ("error" in result) { setRowError(result.error); return }
    onUpdate(item.id, {
      image_url: result.permanentUrl,
      status:    "complete",
    })
    setUrlInput("")
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setRowError(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", "image")
    if (item.producer_slug) fd.append("producer_slug", item.producer_slug)
    try {
      const { uploadAssetFile } = await import("@/app/actions/assets")
      const uploadResult = await uploadAssetFile(fd)
      if ("error" in uploadResult) { setRowError((uploadResult as { error: string }).error); return }
      const r = uploadResult as { id: string; url: string }
      const result = await completeMidjourneyAsset({
        id:              item.id,
        imageUrl:        r.url,
        existingAssetId: r.id,
        producerSlug:    item.producer_slug ?? undefined,
      })
      if ("error" in result) { setRowError(result.error); return }
      onUpdate(item.id, {
        image_url: result.permanentUrl,
        status:    "complete",
      })
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleMarkFailed() {
    setMarking(true)
    const r = await markMidjourneyFailed(item.id)
    setMarking(false)
    if (r.error) { setRowError(r.error); return }
    onUpdate(item.id, { status: "failed" })
  }

  async function handleDelete() {
    setDeleting(true)
    const r = await deleteGenerationJob(item.id)
    setDeleting(false)
    if (r.error) { setRowError(r.error); return }
    onRemove(item.id)
  }

  const statusKey = item.status ?? "pending"

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium border ${STATUS_COLORS[statusKey] ?? "bg-white/10 text-white/50 border-white/20"}`}>
                {statusKey}
              </span>
              {item.producer_slug && (
                <span className="text-[10px] font-mono text-violet-400/60">{item.producer_slug}</span>
              )}
              <span className="text-[10px] text-white/25">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
            {item.linked_job_title && (
              <p className="text-[11px] text-white/40 truncate">
                Job: {item.linked_job_title}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="shrink-0 w-7 h-7 rounded-lg border border-white/[0.07] text-white/25 hover:text-red-400 hover:border-red-400/30 disabled:opacity-40 flex items-center justify-center text-sm transition-colors"
            title="Delete"
          >
            {deleting ? "…" : "×"}
          </button>
        </div>

        {/* Prompt */}
        {item.prompt && (
          <div className="flex items-start gap-2">
            <div className="flex-1 bg-black/30 rounded-lg px-3 py-2 min-w-0">
              <p className="text-[11px] text-white/50 font-mono leading-relaxed line-clamp-3 break-words">{item.prompt}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(item.prompt ?? "")
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="shrink-0 px-2.5 py-2 rounded-lg border border-white/[0.08] text-[10px] text-white/40 hover:text-white hover:border-white/20 transition-colors whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* Completed image */}
        {item.status === "complete" && item.image_url && (
          <div className="rounded-xl overflow-hidden border border-white/[0.08]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt="Completed Midjourney thumbnail"
              className="w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Pending completion form */}
        {item.status === "pending" && (
          <div className="space-y-2 pt-1 border-t border-white/[0.06]">
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25 pt-1">Paste Finished Image URL</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlWarn(null) }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCompleteByUrl() } }}
                placeholder="https://cdn.midjourney.com/…"
                className={`flex-1 bg-black/30 border rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors ${urlWarn ? "border-amber-500/50" : "border-white/[0.08] focus:border-sky-500/50"}`}
              />
              <button
                type="button"
                onClick={handleCompleteByUrl}
                disabled={completing || !urlInput.trim()}
                className="px-4 py-2 rounded-xl bg-sky-700/60 hover:bg-sky-700/80 text-sm text-white disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {completing ? "Saving…" : "Complete"}
              </button>
            </div>
            {urlWarn && <p className="text-[10px] text-amber-300/70">{urlWarn}</p>}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-white/20">or upload file</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex-1 py-2 rounded-xl border border-dashed border-white/[0.1] text-sm text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-40 transition-colors"
              >
                {uploading ? "Uploading…" : "Upload Finished Image"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

              <button
                type="button"
                onClick={handleMarkFailed}
                disabled={marking}
                className="px-3 py-2 rounded-xl border border-red-500/20 text-[11px] text-red-400/60 hover:text-red-400 hover:border-red-500/40 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {marking ? "…" : "Mark Failed"}
              </button>
            </div>
          </div>
        )}

        {/* Failed row actions */}
        {item.status === "failed" && (
          <p className="text-[10px] text-red-400/50 text-center pt-1">This job was marked as failed.</p>
        )}

        {rowError && (
          <p className="text-[10px] text-red-400/70">{rowError}</p>
        )}
      </div>
    </div>
  )
}

interface Props {
  initialItems: MidjourneyQueueRow[]
}

export function MidjourneyQueueClient({ initialItems }: Props) {
  const [items, setItems] = useState<MidjourneyQueueRow[]>(initialItems)
  const [filter, setFilter] = useState<StatusFilter>("all")

  function handleUpdate(id: string, patch: Partial<MidjourneyQueueRow>) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter)

  const FILTERS: Array<{ key: StatusFilter; label: string }> = [
    { key: "all",      label: `All (${items.length})` },
    { key: "pending",  label: `Pending (${items.filter(i => i.status === "pending").length})` },
    { key: "complete", label: `Complete (${items.filter(i => i.status === "complete").length})` },
    { key: "failed",   label: `Failed (${items.filter(i => i.status === "failed").length})` },
  ]

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {FILTERS.map((f) => (
          <button
            type="button"
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] border transition-colors ${
              filter === f.key
                ? "bg-white/[0.08] border-white/20 text-white"
                : "border-white/[0.06] text-white/35 hover:text-white/60 hover:border-white/15"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] py-16 text-center">
          <p className="text-white/20 text-sm">
            {filter === "all" ? "No Midjourney jobs yet. Start one from Thumbnail Studio." : `No ${filter} jobs.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}
