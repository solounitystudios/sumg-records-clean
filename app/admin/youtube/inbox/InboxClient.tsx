"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { AudioInboxRow, InboxStatus } from "@/lib/db/audioInbox"
import {
  bulkAutoProcess,
  bulkApprove,
  bulkCreateJobs,
  bulkRender,
  bulkSchedule,
  updateInboxMetadata,
  classifyAsset,
  approveInboxItem,
  resetInboxItem,
} from "@/app/actions/audioInbox"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Producer { slug: string; name: string }

interface Props {
  items: AudioInboxRow[]
  producers: Producer[]
  counts: Record<string, number>
  activeFilter: string
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  new_asset:          "New Asset",
  analyzing:          "Analyzing",
  needs_review:       "Needs Review",
  needs_metadata:     "Needs Metadata",
  needs_thumbnail:    "Needs Thumbnail",
  needs_render:       "Needs Render",
  ready_to_schedule:  "Ready",
  scheduled:          "Scheduled",
  uploaded:           "Uploaded",
  failed:             "Failed",
}

const STATUS_COLOR: Record<string, string> = {
  new_asset:          "text-white/40 border-white/15 bg-white/[0.03]",
  analyzing:          "text-sky-400/80 border-sky-500/30 bg-sky-400/5",
  needs_review:       "text-orange-400/80 border-orange-500/30 bg-orange-400/5",
  needs_metadata:     "text-yellow-400/80 border-yellow-500/30 bg-yellow-400/5",
  needs_thumbnail:    "text-amber-400/80 border-amber-500/30 bg-amber-400/5",
  needs_render:       "text-amber-400/80 border-amber-500/30 bg-amber-400/5",
  ready_to_schedule:  "text-violet-400/80 border-violet-500/30 bg-violet-400/5",
  scheduled:          "text-violet-400/80 border-violet-500/30 bg-violet-400/5",
  uploaded:           "text-emerald-400/80 border-emerald-500/30 bg-emerald-400/5",
  failed:             "text-red-400/80 border-red-500/30 bg-red-400/5",
}

const FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: "all",                label: "All" },
  { key: "new_asset",          label: "New" },
  { key: "needs_review",       label: "Review" },
  { key: "needs_render",       label: "Render" },
  { key: "ready_to_schedule",  label: "Schedule" },
  { key: "scheduled",          label: "Scheduled" },
  { key: "uploaded",           label: "Uploaded" },
  { key: "failed",             label: "Failed" },
]

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Inline edit state ────────────────────────────────────────────────────────

interface RowEdit {
  overrideTitle:       string
  overrideDescription: string
  overrideTags:        string
  thumbnailPrompt:     string
  producerSlug:        string
}

function initEdit(item: AudioInboxRow): RowEdit {
  return {
    overrideTitle:       item.overrideTitle ?? item.generatedTitle ?? "",
    overrideDescription: item.overrideDescription ?? item.generatedDescription ?? "",
    overrideTags:        (item.overrideTags.length > 0 ? item.overrideTags : item.generatedTags).join("\n"),
    thumbnailPrompt:     item.thumbnailPrompt ?? "",
    producerSlug:        item.producerSlug ?? "",
  }
}

// ─── Row component ────────────────────────────────────────────────────────────

function InboxRow({
  item,
  selected,
  onToggle,
  producers,
  onRefresh,
}: {
  item: AudioInboxRow
  selected: boolean
  onToggle: (id: string) => void
  producers: Producer[]
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState<RowEdit>(() => initEdit(item))
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const showMessage = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    const fd = new FormData()
    fd.set("id", item.id)
    fd.set("override_title", edit.overrideTitle)
    fd.set("override_description", edit.overrideDescription)
    fd.set("override_tags", edit.overrideTags)
    fd.set("thumbnail_prompt", edit.thumbnailPrompt)
    fd.set("producer_slug", edit.producerSlug)
    const r = await updateInboxMetadata(fd)
    setSaving(false)
    if (r.ok) { setEditing(false); onRefresh(); showMessage("Saved") }
    else showMessage(r.error ?? "Save failed")
  }

  async function handleClassify() {
    setActing(true)
    const r = await classifyAsset(item.id)
    setActing(false)
    if (r.ok) { onRefresh(); showMessage(r.slug ? `Classified: ${r.slug}` : "No match — review required") }
    else showMessage(r.error ?? "Classification failed")
  }

  async function handleApprove() {
    setActing(true)
    const r = await approveInboxItem(item.id)
    setActing(false)
    if (r.ok) { onRefresh(); showMessage("Pipeline complete") }
    else showMessage(r.error ?? "Approve failed")
  }

  async function handleReset() {
    setActing(true)
    await resetInboxItem(item.id)
    setActing(false)
    setEdit(initEdit(item))
    onRefresh()
    showMessage("Reset to new_asset")
  }

  const displayTitle = item.overrideTitle || item.generatedTitle
  const hasJob = !!item.ytJobId

  return (
    <div
      className={`border-b border-white/[0.05] transition-colors ${
        selected ? "bg-white/[0.025]" : "hover:bg-white/[0.015]"
      } last:border-b-0`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(item.id)}
          className="w-4 h-4 rounded border-white/20 bg-transparent accent-white flex-none cursor-pointer"
        />

        {/* File info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/80 truncate font-medium" title={item.assetFilename ?? undefined}>
            {item.assetFilename ?? item.assetId}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[9px] text-white/25 font-mono">{formatBytes(item.assetSizeBytes)}</span>
            {item.assetMimeType && (
              <span className="text-[9px] text-white/20">{item.assetMimeType.split("/")[1]}</span>
            )}
            {hasJob && (
              <span className="text-[9px] text-violet-400/50">↗ job</span>
            )}
          </div>
        </div>

        {/* Producer */}
        <div className="w-28 flex-none hidden sm:block">
          {item.producerSlug ? (
            <span className="text-xs text-white/55 font-mono">{item.producerSlug}</span>
          ) : (
            <span className="text-[10px] text-orange-400/50 italic">unclassified</span>
          )}
        </div>

        {/* Status pill */}
        <div className="flex-none">
          <span
            className={`text-[9px] uppercase tracking-wide border px-1.5 py-0.5 rounded whitespace-nowrap ${
              STATUS_COLOR[item.status] ?? "text-white/30 border-white/10"
            }`}
          >
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
        </div>

        {/* Title preview */}
        <div className="w-48 flex-none hidden lg:block min-w-0">
          {displayTitle ? (
            <p className="text-[11px] text-white/50 truncate" title={displayTitle}>{displayTitle}</p>
          ) : (
            <span className="text-[10px] text-white/15 italic">no title</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-none">
          {msg && (
            <span className="text-[9px] text-emerald-400/70 whitespace-nowrap">{msg}</span>
          )}

          {item.status === "new_asset" && !acting && (
            <button
              onClick={handleClassify}
              className="text-[9px] border border-white/15 px-2 py-1 rounded-lg text-white/45 hover:text-white hover:border-white/30 transition-colors whitespace-nowrap"
            >
              Classify
            </button>
          )}

          {item.status === "needs_review" && !acting && (
            <button
              onClick={handleApprove}
              className="text-[9px] border border-orange-500/30 px-2 py-1 rounded-lg text-orange-400/70 hover:text-orange-400 hover:border-orange-500/50 transition-colors whitespace-nowrap"
            >
              Approve
            </button>
          )}

          {acting && (
            <span className="text-[9px] text-white/30">working…</span>
          )}

          <button
            onClick={() => { setExpanded(!expanded); if (!expanded) setEditing(false) }}
            className="text-[9px] border border-white/10 px-2 py-1 rounded-lg text-white/30 hover:text-white/60 hover:border-white/20 transition-colors"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-11 pb-4 pt-1 bg-black/20 border-t border-white/[0.04]">
          {!editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-1">Title</p>
                  <p className="text-xs text-white/60">{displayTitle || <span className="text-white/20 italic">not set</span>}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-1">Variation</p>
                  <p className="text-xs text-white/45 font-mono">{item.variationId?.slice(0, 8) ?? "—"}</p>
                </div>
              </div>

              {(item.overrideTags.length > 0 || item.generatedTags.length > 0) && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {(item.overrideTags.length > 0 ? item.overrideTags : item.generatedTags).slice(0, 10).map((t) => (
                      <span key={t} className="text-[9px] border border-white/10 px-1.5 py-0.5 rounded text-white/35">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {item.thumbnailPrompt && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-1">Thumbnail Prompt</p>
                  <p className="text-[10px] text-white/40 leading-relaxed line-clamp-3">{item.thumbnailPrompt}</p>
                </div>
              )}

              {item.errorMessage && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <p className="text-[10px] text-red-400/80">{item.errorMessage}</p>
                </div>
              )}

              {item.actionLog.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-1">Action Log</p>
                  <div className="space-y-0.5 max-h-28 overflow-y-auto">
                    {[...item.actionLog].reverse().map((entry, i) => (
                      <div key={i} className="flex items-start gap-2 text-[9px]">
                        <span className="text-white/20 font-mono tabular-nums whitespace-nowrap">
                          {new Date(entry.at).toLocaleTimeString()}
                        </span>
                        <span className="text-white/35 font-mono">{entry.action}</span>
                        <span className="text-white/25 truncate">{entry.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => { setEditing(true); setEdit(initEdit(item)) }}
                  className="text-[10px] border border-white/15 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:border-white/30 transition-colors"
                >
                  Edit Fields
                </button>
                <button
                  onClick={handleReset}
                  disabled={acting}
                  className="text-[10px] text-white/20 hover:text-red-400/60 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {/* Producer */}
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">Producer</label>
                <select
                  value={edit.producerSlug}
                  onChange={(e) => setEdit((p) => ({ ...p, producerSlug: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none transition appearance-none"
                >
                  <option value="">Unclassified…</option>
                  {producers.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">
                  Title Override
                  {item.generatedTitle && (
                    <span className="ml-2 normal-case text-white/20">Generated: {item.generatedTitle}</span>
                  )}
                </label>
                <input
                  type="text"
                  value={edit.overrideTitle}
                  onChange={(e) => setEdit((p) => ({ ...p, overrideTitle: e.target.value }))}
                  placeholder={item.generatedTitle ?? "Enter title…"}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">Description Override</label>
                <textarea
                  value={edit.overrideDescription}
                  onChange={(e) => setEdit((p) => ({ ...p, overrideDescription: e.target.value }))}
                  rows={4}
                  placeholder={item.generatedDescription ?? "Enter description…"}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-y"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">
                  Tags Override <span className="normal-case text-white/20">(one per line)</span>
                </label>
                <textarea
                  value={edit.overrideTags}
                  onChange={(e) => setEdit((p) => ({ ...p, overrideTags: e.target.value }))}
                  rows={4}
                  placeholder={item.generatedTags.join("\n")}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-y font-mono"
                />
              </div>

              {/* Thumbnail prompt */}
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">Thumbnail Prompt</label>
                <textarea
                  value={edit.thumbnailPrompt}
                  onChange={(e) => setEdit((p) => ({ ...p, thumbnailPrompt: e.target.value }))}
                  rows={3}
                  placeholder="Describe the visual for the thumbnail…"
                  className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-y"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-white/90 transition disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-white/30 hover:text-white/60 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

export function InboxClient({ items, producers, counts, activeFilter }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [bulkMsg, setBulkMsg] = useState<string | null>(null)

  const refresh = useCallback(() => router.refresh(), [router])

  const filteredItems = activeFilter === "all"
    ? items
    : items.filter((i) => i.status === activeFilter)

  function toggleAll() {
    if (selected.size === filteredItems.length && filteredItems.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredItems.map((i) => i.id)))
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function runBulk(
    label: string,
    action: (ids: string[]) => Promise<{ processed: number; errors: string[] }>
  ) {
    const ids = Array.from(selected)
    startTransition(async () => {
      const result = await action(ids)
      setBulkMsg(`${label}: ${result.processed} processed${result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}`)
      setSelected(new Set())
      router.refresh()
      setTimeout(() => setBulkMsg(null), 4000)
    })
  }

  const allSelected = filteredItems.length > 0 && selected.size === filteredItems.length

  // Build filter URL
  function filterHref(key: string) {
    return key === "all" ? "/admin/youtube/inbox" : `/admin/youtube/inbox?status=${key}`
  }

  return (
    <div className="pb-24">

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-5 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const isActive = tab.key === activeFilter
          const count = counts[tab.key] ?? 0
          return (
            <a
              key={tab.key}
              href={filterHref(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 text-[9px] tabular-nums opacity-60">{count}</span>
              )}
            </a>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-white/20 bg-transparent accent-white flex-none cursor-pointer"
          />
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 flex-1">File</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 w-28 flex-none hidden sm:block">Producer</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 flex-none">Status</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 w-48 flex-none hidden lg:block">Title</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 w-24 flex-none">Actions</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-white/25">No items in this view.</p>
            <p className="text-[11px] text-white/15 mt-2">
              Upload audio files in{" "}
              <a href="/admin/assets" className="underline underline-offset-2">Assets →</a>
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <InboxRow
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={toggle}
              producers={producers}
              onRefresh={refresh}
            />
          ))
        )}
      </div>

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-[#0d1016]/95 backdrop-blur px-4 py-3 shadow-2xl shadow-black/60">
          <span className="text-[10px] text-white/40 font-mono tabular-nums mr-1">
            {selected.size} selected
          </span>

          {bulkMsg && (
            <span className="text-[10px] text-emerald-400/80 mr-1">{bulkMsg}</span>
          )}

          {!isPending ? (
            <>
              <button
                onClick={() => runBulk("Auto-classify", bulkAutoProcess)}
                className="text-[11px] border border-white/20 px-3 py-1.5 rounded-xl text-white/60 hover:text-white hover:border-white/35 transition-colors whitespace-nowrap"
              >
                Auto-Classify
              </button>
              <button
                onClick={() => runBulk("Approve", bulkApprove)}
                className="text-[11px] border border-orange-500/30 px-3 py-1.5 rounded-xl text-orange-400/70 hover:text-orange-400 hover:border-orange-500/50 transition-colors whitespace-nowrap"
              >
                Approve
              </button>
              <button
                onClick={() => runBulk("Create Jobs", bulkCreateJobs)}
                className="text-[11px] border border-white/20 px-3 py-1.5 rounded-xl text-white/60 hover:text-white hover:border-white/35 transition-colors whitespace-nowrap"
              >
                Create Jobs
              </button>
              <button
                onClick={() => runBulk("Render", bulkRender)}
                className="text-[11px] border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-400/70 hover:text-amber-400 hover:border-amber-500/50 transition-colors whitespace-nowrap"
              >
                Bulk Render
              </button>
              <button
                onClick={() => runBulk("Schedule", bulkSchedule)}
                className="text-[11px] border border-violet-500/30 px-3 py-1.5 rounded-xl text-violet-400/70 hover:text-violet-400 hover:border-violet-500/50 transition-colors whitespace-nowrap"
              >
                Schedule
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-[10px] text-white/25 hover:text-white/50 transition-colors ml-1"
              >
                ✕
              </button>
            </>
          ) : (
            <span className="text-[11px] text-white/40 px-2">Processing…</span>
          )}
        </div>
      )}
    </div>
  )
}
