"use client"

import { useState, useMemo, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { AssetRow } from "@/lib/db/assets"
import {
  deleteAssetFile,
  bulkDeleteAssets,
  bulkSendToInbox,
  bulkTagAssets,
  bulkAssignProducer,
  bulkUpdateStatus,
} from "@/app/actions/assets"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Producer { slug: string; name: string }

interface Props {
  assets: AssetRow[]
  producers: Producer[]
}

type ViewMode = "grid" | "table"
type SortKey  = "newest" | "oldest" | "largest"

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_TABS = [
  { value: "all",      label: "All" },
  { value: "image",    label: "Images" },
  { value: "audio",    label: "Audio" },
  { value: "video",    label: "Video" },
  { value: "document", label: "Docs" },
] as const

const SUBCATS: Record<string, { value: string; label: string }[]> = {
  audio: [
    { value: "beat",      label: "Beats" },
    { value: "master",    label: "Masters" },
    { value: "vocal",     label: "Vocals" },
    { value: "stem",      label: "Stems" },
    { value: "loop",      label: "Loops" },
    { value: "hook",      label: "Hooks" },
    { value: "reference", label: "Reference" },
  ],
  image: [
    { value: "artist_photo", label: "Artist Photos" },
    { value: "cover",        label: "Covers" },
    { value: "thumbnail",    label: "Thumbnails" },
    { value: "merch",        label: "Merch" },
    { value: "mockup",       label: "Mockups" },
    { value: "brand",        label: "Brand" },
  ],
  video: [
    { value: "visualizer",  label: "Visualizer" },
    { value: "short",       label: "Shorts" },
    { value: "promo",       label: "Promos" },
    { value: "music_video", label: "Music Videos" },
    { value: "reel",        label: "Reels" },
    { value: "render",      label: "Renders" },
  ],
  document: [
    { value: "lyrics",   label: "Lyrics" },
    { value: "contract", label: "Contracts" },
    { value: "zip",      label: "Zip Packs" },
  ],
}

const STATUS_OPTS = [
  { value: "all",      label: "All Status" },
  { value: "ready",    label: "Ready" },
  { value: "used",     label: "Used" },
  { value: "pending",  label: "Pending" },
  { value: "draft",    label: "Draft" },
  { value: "archived", label: "Archived" },
  { value: "broken",   label: "Broken" },
]

const STATUS_COLOR: Record<string, string> = {
  ready:    "text-emerald-400/70 bg-emerald-500/10 border-emerald-500/20",
  used:     "text-violet-400/70 bg-violet-500/10 border-violet-500/20",
  pending:  "text-amber-400/70 bg-amber-500/10 border-amber-500/20",
  draft:    "text-white/35 bg-white/[0.04] border-white/10",
  archived: "text-white/20 bg-white/[0.02] border-white/[0.07]",
  broken:   "text-red-400/70 bg-red-500/10 border-red-500/20",
}

const TYPE_ICON: Record<string, string> = {
  image: "▣", audio: "♫", document: "▤", video: "▶",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelativeTime(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (d === 0) return "today"
  if (d === 1) return "yesterday"
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

function matchesSearch(a: AssetRow, q: string): boolean {
  const lq = q.toLowerCase()
  return (
    a.filename.toLowerCase().includes(lq) ||
    (a.producer_slug ?? "").toLowerCase().includes(lq) ||
    a.tags.some((t) => t.toLowerCase().includes(lq)) ||
    a.id.toLowerCase().includes(lq)
  )
}

function isWithinDays(dateStr: string, days: number): boolean {
  return Date.now() - new Date(dateStr).getTime() < days * 86400000
}

// ─── AssetCard ────────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  selected,
  onToggle,
  onDelete,
  onSendToInbox,
}: {
  asset: AssetRow
  selected: boolean
  onToggle: () => void
  onDelete: () => void
  onSendToInbox: () => void
}) {
  const [copied, setCopied] = useState(false)
  const isImage = asset.type === "image"

  async function copyUrl() {
    await navigator.clipboard.writeText(asset.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-colors ${
        selected
          ? "border-white/30 bg-[#0d1016]"
          : "border-white/[0.07] bg-[#0d1016] hover:border-white/15"
      }`}
    >
      {/* Checkbox overlay */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-white/30 bg-black/60 accent-white cursor-pointer"
        />
      </div>

      {/* Status badge overlay */}
      {asset.status && asset.status !== "ready" && (
        <div className="absolute top-2 right-2 z-10">
          <span className={`text-[8px] uppercase tracking-wide border px-1.5 py-0.5 rounded font-medium backdrop-blur-sm ${STATUS_COLOR[asset.status] ?? ""}`}>
            {asset.status}
          </span>
        </div>
      )}

      {/* Preview */}
      <div className="aspect-square bg-white/[0.03] flex items-center justify-center overflow-hidden">
        {isImage ? (
          <img
            src={asset.url}
            alt={asset.alt_text ?? asset.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-3xl text-white/15">{TYPE_ICON[asset.type] ?? "▤"}</span>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-medium truncate text-white/70" title={asset.filename}>
          {asset.filename}
        </p>
        <div className="flex items-center justify-between mt-1 gap-1">
          <span className="text-[9px] text-white/25 uppercase tracking-wide truncate">
            {asset.subcategory ?? asset.type}
          </span>
          <span className="text-[9px] text-white/25 tabular-nums shrink-0">
            {formatBytes(asset.size_bytes)}
          </span>
        </div>
        {asset.producer_slug && (
          <p className="text-[9px] text-white/30 mt-0.5 truncate">{asset.producer_slug}</p>
        )}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {asset.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[8px] border border-white/[0.07] px-1.5 py-0.5 rounded text-white/30">
                {t}
              </span>
            ))}
            {asset.tags.length > 3 && (
              <span className="text-[8px] text-white/20">+{asset.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-white/30 hover:text-white/60 transition-colors"
          >
            Open ↗
          </a>
          <button
            onClick={copyUrl}
            className="text-[9px] text-white/20 hover:text-white/50 transition-colors"
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
          {asset.type === "audio" && (
            <button
              onClick={onSendToInbox}
              className="text-[9px] text-violet-400/50 hover:text-violet-400 transition-colors ml-auto"
              title="Send to YouTube Inbox"
            >
              → Inbox
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-[9px] text-white/15 hover:text-red-400/60 transition-colors ml-auto"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AssetTableRow ────────────────────────────────────────────────────────────

function AssetTableRow({
  asset,
  selected,
  onToggle,
  onDelete,
  onSendToInbox,
}: {
  asset: AssetRow
  selected: boolean
  onToggle: () => void
  onDelete: () => void
  onSendToInbox: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copyUrl() {
    await navigator.clipboard.writeText(asset.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <tr className={`border-b border-white/[0.04] last:border-0 transition-colors ${selected ? "bg-white/[0.025]" : "hover:bg-white/[0.015]"}`}>
      <td className="pl-4 py-2.5 w-8">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-white/20 bg-transparent accent-white cursor-pointer"
        />
      </td>
      <td className="py-2.5 pr-3 min-w-0 max-w-[200px]">
        <p className="text-xs text-white/70 truncate font-medium" title={asset.filename}>
          {asset.filename}
        </p>
      </td>
      <td className="py-2.5 pr-3 w-24 hidden sm:table-cell">
        <span className="text-[9px] text-white/35 uppercase tracking-wide">
          {asset.subcategory ?? asset.type}
        </span>
      </td>
      <td className="py-2.5 pr-3 w-28 hidden md:table-cell">
        <span className="text-[10px] text-white/40 font-mono">{asset.producer_slug ?? "—"}</span>
      </td>
      <td className="py-2.5 pr-3 w-20">
        <span className={`text-[9px] uppercase tracking-wide border px-1.5 py-0.5 rounded ${STATUS_COLOR[asset.status] ?? ""}`}>
          {asset.status}
        </span>
      </td>
      <td className="py-2.5 pr-3 w-20 hidden lg:table-cell">
        <span className="text-[10px] text-white/30 tabular-nums">{formatBytes(asset.size_bytes)}</span>
      </td>
      <td className="py-2.5 pr-3 w-20 hidden xl:table-cell">
        <span className="text-[10px] text-white/25">{formatRelativeTime(asset.created_at)}</span>
      </td>
      <td className="py-2.5 pr-4 w-32">
        <div className="flex items-center gap-3">
          <button onClick={copyUrl} className="text-[9px] text-white/25 hover:text-white/60 transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-white/25 hover:text-white/60 transition-colors">
            Open ↗
          </a>
          {asset.type === "audio" && (
            <button onClick={onSendToInbox} className="text-[9px] text-violet-400/40 hover:text-violet-400 transition-colors" title="Send to YouTube Inbox">
              Inbox
            </button>
          )}
          <button onClick={onDelete} className="text-[9px] text-white/15 hover:text-red-400/60 transition-colors">
            ✕
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssetsClient({ assets, producers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filter state
  const [typeFilter,   setTypeFilter]   = useState("all")
  const [subcatFilter, setSubcatFilter] = useState("all")
  const [prodFilter,   setProdFilter]   = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter,   setDateFilter]   = useState("all")
  const [search,       setSearch]       = useState("")
  const [sortBy,       setSortBy]       = useState<SortKey>("newest")
  const [view,         setView]         = useState<ViewMode>("grid")

  // Selection + bulk action state
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [bulkMsg,      setBulkMsg]      = useState<string | null>(null)
  const [tagInput,     setTagInput]     = useState("")
  const [bulkAction,   setBulkAction]   = useState<"tag" | "producer" | "status" | null>(null)
  const [bulkProducer, setBulkProducer] = useState("")
  const [bulkStatus,   setBulkStatus]   = useState("ready")

  const refresh = useCallback(() => {
    router.refresh()
    setSelected(new Set())
  }, [router])

  function flashMsg(msg: string) {
    setBulkMsg(msg)
    setTimeout(() => setBulkMsg(null), 4000)
  }

  // When type changes, reset subcat
  function changeType(t: string) {
    setTypeFilter(t)
    setSubcatFilter("all")
  }

  // Filtered + sorted assets
  const filtered = useMemo(() => {
    let result = assets

    if (typeFilter !== "all")
      result = result.filter((a) => a.type === typeFilter)

    if (subcatFilter !== "all")
      result = result.filter((a) => a.subcategory === subcatFilter)

    if (prodFilter !== "all")
      result = result.filter((a) => a.producer_slug === prodFilter)

    if (statusFilter !== "all")
      result = result.filter((a) => a.status === statusFilter)

    if (dateFilter === "today")
      result = result.filter((a) => isWithinDays(a.created_at, 1))
    else if (dateFilter === "7d")
      result = result.filter((a) => isWithinDays(a.created_at, 7))
    else if (dateFilter === "30d")
      result = result.filter((a) => isWithinDays(a.created_at, 30))

    if (search.trim())
      result = result.filter((a) => matchesSearch(a, search.trim()))

    if (sortBy === "oldest")
      result = [...result].sort((a, b) => a.created_at.localeCompare(b.created_at))
    else if (sortBy === "largest")
      result = [...result].sort((a, b) => (b.size_bytes ?? 0) - (a.size_bytes ?? 0))

    return result
  }, [assets, typeFilter, subcatFilter, prodFilter, statusFilter, dateFilter, search, sortBy])

  // Available subcategories for the active type filter
  const subcats = typeFilter !== "all" ? (SUBCATS[typeFilter] ?? []) : []

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((a) => a.id)))
    }
  }

  // Single-asset delete
  function handleSingleDelete(id: string) {
    startTransition(async () => {
      await deleteAssetFile(id)
      refresh()
    })
  }

  // Single-asset send to inbox
  function handleSingleInbox(id: string) {
    startTransition(async () => {
      const r = await bulkSendToInbox([id])
      if (r.queued > 0) flashMsg("Sent to YouTube Inbox")
      else flashMsg(r.errors[0] ?? "Already in inbox")
      refresh()
    })
  }

  // Bulk operations
  function runBulkDelete() {
    const ids = Array.from(selected)
    startTransition(async () => {
      const r = await bulkDeleteAssets(ids)
      flashMsg(`Deleted ${r.deleted} asset${r.deleted !== 1 ? "s" : ""}`)
      setBulkAction(null)
      refresh()
    })
  }

  function runBulkInbox() {
    const ids = Array.from(selected)
    startTransition(async () => {
      const r = await bulkSendToInbox(ids)
      if (r.queued > 0) flashMsg(`Sent ${r.queued} to YouTube Inbox`)
      else flashMsg(r.errors[0] ?? "No audio assets selected")
      setBulkAction(null)
      refresh()
    })
  }

  function runBulkTag() {
    if (!tagInput.trim()) return
    const ids = Array.from(selected)
    const tags = tagInput.split(/[,\n]/).map((t) => t.trim()).filter(Boolean)
    startTransition(async () => {
      await bulkTagAssets(ids, tags)
      flashMsg(`Tagged ${ids.length} asset${ids.length !== 1 ? "s" : ""}`)
      setTagInput("")
      setBulkAction(null)
      refresh()
    })
  }

  function runBulkProducer() {
    const ids = Array.from(selected)
    startTransition(async () => {
      await bulkAssignProducer(ids, bulkProducer)
      flashMsg(`Assigned ${ids.length} asset${ids.length !== 1 ? "s" : ""}`)
      setBulkAction(null)
      refresh()
    })
  }

  function runBulkStatus() {
    const ids = Array.from(selected)
    startTransition(async () => {
      await bulkUpdateStatus(ids, bulkStatus)
      flashMsg(`Updated status on ${ids.length} asset${ids.length !== 1 ? "s" : ""}`)
      setBulkAction(null)
      refresh()
    })
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-32">

      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      <div className="space-y-2 mb-5">

        {/* Type tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {TYPE_TABS.map((tab) => {
            const count = tab.value === "all"
              ? assets.length
              : assets.filter((a) => a.type === tab.value).length
            return (
              <button
                key={tab.value}
                onClick={() => changeType(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  typeFilter === tab.value
                    ? "bg-white/[0.08] text-white"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-[9px] tabular-nums opacity-60">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Subcategory chips */}
        {subcats.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setSubcatFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[10px] transition-colors ${
                subcatFilter === "all"
                  ? "bg-white/[0.06] text-white/80"
                  : "text-white/25 hover:text-white/50"
              }`}
            >
              All
            </button>
            {subcats.map((s) => (
              <button
                key={s.value}
                onClick={() => setSubcatFilter(subcatFilter === s.value ? "all" : s.value)}
                className={`px-2.5 py-1 rounded-lg text-[10px] transition-colors ${
                  subcatFilter === s.value
                    ? "bg-white/[0.06] text-white/80 border border-white/15"
                    : "text-white/25 hover:text-white/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Secondary filter row */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Producer */}
          <select
            value={prodFilter}
            onChange={(e) => setProdFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/60 focus:outline-none focus:border-white/20 transition appearance-none"
          >
            <option value="all">All Producers</option>
            {producers.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/60 focus:outline-none focus:border-white/20 transition appearance-none"
          >
            {STATUS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/60 focus:outline-none focus:border-white/20 transition appearance-none"
          >
            <option value="all">Any Date</option>
            <option value="today">Today</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filename, producer, tag…"
            className="flex-1 min-w-[160px] max-w-sm rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition"
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/60 focus:outline-none focus:border-white/20 transition appearance-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="largest">Largest</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center border border-white/[0.08] rounded-lg overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`px-2.5 py-1.5 text-[11px] transition-colors ${view === "grid" ? "bg-white/[0.08] text-white" : "text-white/30 hover:text-white/60"}`}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-2.5 py-1.5 text-[11px] transition-colors ${view === "table" ? "bg-white/[0.08] text-white" : "text-white/30 hover:text-white/60"}`}
              title="Table view"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* ── Results header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-white/20 bg-transparent accent-white cursor-pointer"
            title={allSelected ? "Deselect all" : "Select all visible"}
          />
          <span className="text-[11px] text-white/35">
            {filtered.length} {filtered.length === 1 ? "file" : "files"}
            {filtered.length !== assets.length && ` of ${assets.length}`}
          </span>
          {selected.size > 0 && (
            <span className="text-[11px] text-white/60 font-medium">
              · {selected.size} selected
            </span>
          )}
        </div>
        {(typeFilter !== "all" || subcatFilter !== "all" || prodFilter !== "all" || statusFilter !== "all" || dateFilter !== "all" || search) && (
          <button
            onClick={() => {
              setTypeFilter("all")
              setSubcatFilter("all")
              setProdFilter("all")
              setStatusFilter("all")
              setDateFilter("all")
              setSearch("")
            }}
            className="text-[10px] text-white/25 hover:text-white/60 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-6 py-14 text-center">
          <p className="text-sm text-white/30">
            {assets.length === 0 ? "No assets yet. Upload your first file above." : "No files match the current filters."}
          </p>
        </div>
      )}

      {/* ── Grid view ────────────────────────────────────────────────────────── */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              selected={selected.has(asset.id)}
              onToggle={() => toggle(asset.id)}
              onDelete={() => handleSingleDelete(asset.id)}
              onSendToInbox={() => handleSingleInbox(asset.id)}
            />
          ))}
        </div>
      )}

      {/* ── Table view ───────────────────────────────────────────────────────── */}
      {view === "table" && filtered.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="pl-4 py-2.5 w-8" />
                <th className="py-2.5 pr-3 text-left text-[9px] uppercase tracking-[0.2em] text-white/25 font-normal">File</th>
                <th className="py-2.5 pr-3 text-left text-[9px] uppercase tracking-[0.2em] text-white/25 font-normal hidden sm:table-cell">Type</th>
                <th className="py-2.5 pr-3 text-left text-[9px] uppercase tracking-[0.2em] text-white/25 font-normal hidden md:table-cell">Producer</th>
                <th className="py-2.5 pr-3 text-left text-[9px] uppercase tracking-[0.2em] text-white/25 font-normal">Status</th>
                <th className="py-2.5 pr-3 text-left text-[9px] uppercase tracking-[0.2em] text-white/25 font-normal hidden lg:table-cell">Size</th>
                <th className="py-2.5 pr-3 text-left text-[9px] uppercase tracking-[0.2em] text-white/25 font-normal hidden xl:table-cell">Date</th>
                <th className="py-2.5 pr-4 text-left text-[9px] uppercase tracking-[0.2em] text-white/25 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <AssetTableRow
                  key={asset.id}
                  asset={asset}
                  selected={selected.has(asset.id)}
                  onToggle={() => toggle(asset.id)}
                  onDelete={() => handleSingleDelete(asset.id)}
                  onSendToInbox={() => handleSingleInbox(asset.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Bulk action bar ───────────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-3rem)] max-w-3xl rounded-2xl border border-white/[0.12] bg-[#0d1016]/95 backdrop-blur shadow-2xl shadow-black/60 overflow-hidden">

          {/* Inline sub-panels */}
          {bulkAction === "tag" && (
            <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runBulkTag()}
                placeholder="beats, sumg, nightwire…"
                autoFocus
                className="flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition"
              />
              <button
                onClick={runBulkTag}
                disabled={isPending || !tagInput.trim()}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
              >
                Apply Tags
              </button>
              <button onClick={() => setBulkAction(null)} className="text-xs text-white/30 hover:text-white/60">✕</button>
            </div>
          )}

          {bulkAction === "producer" && (
            <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] flex items-center gap-2">
              <select
                value={bulkProducer}
                onChange={(e) => setBulkProducer(e.target.value)}
                className="flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 transition appearance-none"
              >
                <option value="">Unassign</option>
                {producers.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={runBulkProducer}
                disabled={isPending}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
              >
                Assign
              </button>
              <button onClick={() => setBulkAction(null)} className="text-xs text-white/30 hover:text-white/60">✕</button>
            </div>
          )}

          {bulkAction === "status" && (
            <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] flex items-center gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 transition appearance-none"
              >
                {STATUS_OPTS.filter((o) => o.value !== "all").map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={runBulkStatus}
                disabled={isPending}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
              >
                Update
              </button>
              <button onClick={() => setBulkAction(null)} className="text-xs text-white/30 hover:text-white/60">✕</button>
            </div>
          )}

          {/* Main bar */}
          <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
            <span className="text-[10px] text-white/40 font-mono tabular-nums mr-1">
              {selected.size} selected
            </span>

            {bulkMsg && (
              <span className="text-[10px] text-emerald-400/80">{bulkMsg}</span>
            )}

            {!isPending ? (
              <>
                <button
                  onClick={() => setBulkAction(bulkAction === "tag" ? null : "tag")}
                  className={`text-[11px] border px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${bulkAction === "tag" ? "border-white/30 text-white" : "border-white/20 text-white/60 hover:text-white hover:border-white/35"}`}
                >
                  Tag
                </button>
                <button
                  onClick={() => setBulkAction(bulkAction === "producer" ? null : "producer")}
                  className={`text-[11px] border px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${bulkAction === "producer" ? "border-white/30 text-white" : "border-white/20 text-white/60 hover:text-white hover:border-white/35"}`}
                >
                  Assign Producer
                </button>
                <button
                  onClick={() => setBulkAction(bulkAction === "status" ? null : "status")}
                  className={`text-[11px] border px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${bulkAction === "status" ? "border-white/30 text-white" : "border-white/20 text-white/60 hover:text-white hover:border-white/35"}`}
                >
                  Set Status
                </button>
                <button
                  onClick={runBulkInbox}
                  className="text-[11px] border border-violet-500/30 px-3 py-1.5 rounded-xl text-violet-400/70 hover:text-violet-400 hover:border-violet-500/50 transition-colors whitespace-nowrap"
                >
                  → YT Inbox
                </button>
                <button
                  onClick={runBulkDelete}
                  className="text-[11px] border border-red-500/25 px-3 py-1.5 rounded-xl text-red-400/60 hover:text-red-400 hover:border-red-500/45 transition-colors whitespace-nowrap ml-auto"
                >
                  Delete
                </button>
                <button
                  onClick={() => { setSelected(new Set()); setBulkAction(null) }}
                  className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
                >
                  ✕
                </button>
              </>
            ) : (
              <span className="text-[11px] text-white/40 px-2">Working…</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
