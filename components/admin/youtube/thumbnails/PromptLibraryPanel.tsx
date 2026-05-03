"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import {
  getPromptLibrary,
  createPrompt,
  updatePrompt,
  archivePrompt,
  restorePrompt,
  deletePromptPermanently,
  duplicatePrompt,
  markPromptFavorite,
  markPromptWinner,
} from "@/lib/youtube/thumbnails/actions"
import type { ThumbnailPromptRow, PromptLibraryFilters } from "@/lib/youtube/thumbnails/types"

const STYLE_BUCKETS = [
  "MindLoft Sessions",
  "Buffalo Noir",
  "Jazz Smoke",
  "Harlem Private Society",
  "Museum Nights",
  "Street Prestige",
]

interface Props {
  producers:          Array<{ slug: string; name: string }>
  onUseInJobMode?:    (prompt: string) => void
  onUseInFreeCreate?: (prompt: string) => void
}

type ViewMode = "all" | "favorites" | "winners" | "archived"

interface EditDraft {
  name: string
  prompt: string
  description: string
  category: string
  styleBucket: string
  ctrScore: string
}

function emptyDraft(p?: ThumbnailPromptRow): EditDraft {
  return {
    name:        p?.name ?? "",
    prompt:      p?.prompt ?? "",
    description: p?.description ?? "",
    category:    p?.category ?? "",
    styleBucket: p?.style_bucket ?? "",
    ctrScore:    p?.ctr_score != null ? String(p.ctr_score) : "",
  }
}

export function PromptLibraryPanel({ producers, onUseInJobMode, onUseInFreeCreate }: Props) {
  const [prompts,          setPrompts]          = useState<ThumbnailPromptRow[]>([])
  const [loading,          setLoading]          = useState(true)
  const [viewMode,         setViewMode]         = useState<ViewMode>("all")
  const [search,           setSearch]           = useState("")
  const [filterProducer,   setFilterProducer]   = useState("")
  const [filterBucket,     setFilterBucket]     = useState("")
  const [editingId,        setEditingId]        = useState<string | null>(null)
  const [editDraft,        setEditDraft]        = useState<EditDraft>(emptyDraft())
  const [deleteConfirmId,  setDeleteConfirmId]  = useState<string | null>(null)
  const [createMode,       setCreateMode]       = useState(false)
  const [newDraft,         setNewDraft]         = useState<EditDraft & { producerSlug: string }>({ ...emptyDraft(), producerSlug: producers[0]?.slug ?? "" })
  const [isPending,        startTransition]     = useTransition()
  const [msg,              setMsg]              = useState<string | null>(null)

  const buildFilters = useCallback((): PromptLibraryFilters => ({
    search:          search.trim() || undefined,
    producerSlug:    filterProducer || undefined,
    styleBucket:     filterBucket || undefined,
    favoritesOnly:   viewMode === "favorites",
    winnersOnly:     viewMode === "winners",
    includeArchived: viewMode === "archived",
  }), [search, filterProducer, filterBucket, viewMode])

  const loadPrompts = useCallback(async () => {
    setLoading(true)
    const data = await getPromptLibrary(buildFilters())
    setPrompts(data)
    setLoading(false)
  }, [buildFilters])

  useEffect(() => {
    loadPrompts()
  }, [loadPrompts])

  function flash(m: string) {
    setMsg(m)
    setTimeout(() => setMsg(null), 3000)
  }

  function startEdit(p: ThumbnailPromptRow) {
    setEditingId(p.id)
    setEditDraft(emptyDraft(p))
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function handleSaveEdit() {
    if (!editingId) return
    startTransition(async () => {
      const result = await updatePrompt(editingId, {
        prompt:      editDraft.prompt || undefined,
        name:        editDraft.name || undefined,
        description: editDraft.description || undefined,
        category:    editDraft.category || undefined,
        styleBucket: editDraft.styleBucket || undefined,
        ctrScore:    editDraft.ctrScore ? parseFloat(editDraft.ctrScore) : null,
      })
      if (result.error) {
        flash(`Error: ${result.error}`)
      } else {
        setEditingId(null)
        flash("Saved")
        await loadPrompts()
      }
    })
  }

  function handleToggleFavorite(p: ThumbnailPromptRow) {
    startTransition(async () => {
      await markPromptFavorite(p.id, !p.favorite)
      setPrompts((prev) => prev.map((x) => x.id === p.id ? { ...x, favorite: !p.favorite } : x))
    })
  }

  function handleToggleWinner(p: ThumbnailPromptRow) {
    startTransition(async () => {
      await markPromptWinner(p.id, !p.winner_bool)
      setPrompts((prev) => prev.map((x) => x.id === p.id ? { ...x, winner_bool: !p.winner_bool } : x))
    })
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicatePrompt(id)
      if ("error" in result) {
        flash(`Error: ${result.error}`)
      } else {
        flash("Duplicated")
        await loadPrompts()
      }
    })
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      await archivePrompt(id)
      setPrompts((prev) => prev.filter((x) => x.id !== id))
      flash("Archived")
    })
  }

  function handleRestore(id: string) {
    startTransition(async () => {
      await restorePrompt(id)
      setPrompts((prev) => prev.filter((x) => x.id !== id))
      flash("Restored")
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePromptPermanently(id)
      setDeleteConfirmId(null)
      setPrompts((prev) => prev.filter((x) => x.id !== id))
      flash("Deleted permanently")
    })
  }

  function handleCreateNew() {
    startTransition(async () => {
      if (!newDraft.prompt.trim() || !newDraft.producerSlug) {
        flash("Producer and prompt are required")
        return
      }
      const result = await createPrompt({
        producerSlug: newDraft.producerSlug,
        prompt:       newDraft.prompt,
        name:         newDraft.name || undefined,
        description:  newDraft.description || undefined,
        category:     newDraft.category || undefined,
        styleBucket:  newDraft.styleBucket || undefined,
        ctrScore:     newDraft.ctrScore ? parseFloat(newDraft.ctrScore) : undefined,
      })
      if ("error" in result) {
        flash(`Error: ${result.error}`)
      } else {
        setCreateMode(false)
        setNewDraft({ ...emptyDraft(), producerSlug: newDraft.producerSlug })
        flash("Created")
        await loadPrompts()
      }
    })
  }

  const VIEW_TABS: Array<{ key: ViewMode; label: string }> = [
    { key: "all",       label: "All" },
    { key: "favorites", label: "★ Favorites" },
    { key: "winners",   label: "🏆 Winners" },
    { key: "archived",  label: "Archived" },
  ]

  return (
    <div className="space-y-5 pb-24">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompts…"
          className="flex-1 bg-[#0d1016] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
        />

        {/* Producer filter */}
        <select
          value={filterProducer}
          onChange={(e) => setFilterProducer(e.target.value)}
          className="bg-[#0d1016] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
        >
          <option value="">All Producers</option>
          {producers.map((p) => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </select>

        {/* Style bucket filter */}
        <select
          value={filterBucket}
          onChange={(e) => setFilterBucket(e.target.value)}
          className="bg-[#0d1016] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
        >
          <option value="">All Styles</option>
          {STYLE_BUCKETS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* New prompt button */}
        <button
          type="button"
          onClick={() => setCreateMode((p) => !p)}
          className="px-5 py-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-sm font-medium transition-colors whitespace-nowrap"
        >
          + New Prompt
        </button>
      </div>

      {/* ── View mode tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {VIEW_TABS.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              viewMode === tab.key
                ? "bg-white/[0.08] text-white"
                : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {msg && (
          <span className="ml-auto text-[11px] text-emerald-400/80">{msg}</span>
        )}
        {!loading && (
          <span className="ml-auto text-[10px] text-white/25 tabular-nums">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Create new form ───────────────────────────────────────────── */}
      {createMode && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5 space-y-4">
          <p className="text-[9px] uppercase tracking-[0.2em] text-violet-400/60">New Prompt</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Producer *</label>
              <select
                value={newDraft.producerSlug}
                onChange={(e) => setNewDraft((d) => ({ ...d, producerSlug: e.target.value }))}
                className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
              >
                <option value="">— Select —</option>
                {producers.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Name</label>
              <input type="text" value={newDraft.name} onChange={(e) => setNewDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Memorable name…" className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Prompt *</label>
            <textarea
              value={newDraft.prompt}
              onChange={(e) => setNewDraft((d) => ({ ...d, prompt: e.target.value }))}
              rows={4}
              placeholder="Full prompt text…"
              className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Style Bucket</label>
              <select
                value={newDraft.styleBucket}
                onChange={(e) => setNewDraft((d) => ({ ...d, styleBucket: e.target.value }))}
                className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
              >
                <option value="">— None —</option>
                {STYLE_BUCKETS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Category</label>
              <input type="text" value={newDraft.category} onChange={(e) => setNewDraft((d) => ({ ...d, category: e.target.value }))} placeholder="e.g. cinematic, editorial…" className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">CTR Score</label>
              <input type="number" min="0" max="100" value={newDraft.ctrScore} onChange={(e) => setNewDraft((d) => ({ ...d, ctrScore: e.target.value }))} placeholder="0–100" className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleCreateNew} disabled={isPending} className="px-5 py-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {isPending ? "Creating…" : "Create Prompt"}
            </button>
            <button type="button" onClick={() => setCreateMode(false)} className="px-4 py-2.5 text-sm text-white/35 hover:text-white/60 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Prompt list ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-16 text-center">
          <p className="text-sm text-white/25">Loading…</p>
        </div>
      ) : prompts.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/[0.05]">
          <p className="text-sm text-white/25">No prompts found.</p>
          <p className="text-[11px] text-white/15 mt-1">Create one above or save prompts from Job Mode or Free Create.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prompts.map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              isEditing={editingId === p.id}
              editDraft={editDraft}
              isArchived={viewMode === "archived"}
              isPending={isPending}
              onEdit={() => startEdit(p)}
              onCancelEdit={cancelEdit}
              onEditDraftChange={setEditDraft}
              onSaveEdit={handleSaveEdit}
              onToggleFavorite={() => handleToggleFavorite(p)}
              onToggleWinner={() => handleToggleWinner(p)}
              onDuplicate={() => handleDuplicate(p.id)}
              onArchive={() => handleArchive(p.id)}
              onRestore={() => handleRestore(p.id)}
              onDeleteRequest={() => setDeleteConfirmId(p.id)}
              onUseInJobMode={onUseInJobMode ? () => onUseInJobMode(p.prompt) : undefined}
              onUseInFreeCreate={onUseInFreeCreate ? () => onUseInFreeCreate(p.prompt) : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Delete confirm dialog ─────────────────────────────────────── */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-[#0d1016] border border-white/[0.12] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-white mb-2">Delete this prompt?</h3>
            <p className="text-xs text-white/35 mb-5 leading-relaxed">
              This permanently removes the prompt from the library. Consider archiving instead to keep it recoverable.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="text-xs text-white/35 hover:text-white/65 px-3 py-1.5 transition-colors">Cancel</button>
              <button type="button" onClick={() => handleDelete(deleteConfirmId)} disabled={isPending} className="text-xs border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors px-4 py-1.5 rounded-lg disabled:opacity-50">
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Prompt card ─────────────────────────────────────────────────────────────

function PromptCard({
  prompt: p,
  isEditing,
  editDraft,
  isArchived,
  isPending,
  onEdit,
  onCancelEdit,
  onEditDraftChange,
  onSaveEdit,
  onToggleFavorite,
  onToggleWinner,
  onDuplicate,
  onArchive,
  onRestore,
  onDeleteRequest,
  onUseInJobMode,
  onUseInFreeCreate,
}: {
  prompt: ThumbnailPromptRow
  isEditing: boolean
  editDraft: EditDraft
  isArchived: boolean
  isPending: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onEditDraftChange: (d: EditDraft) => void
  onSaveEdit: () => void
  onToggleFavorite: () => void
  onToggleWinner: () => void
  onDuplicate: () => void
  onArchive: () => void
  onRestore: () => void
  onDeleteRequest: () => void
  onUseInJobMode?: () => void
  onUseInFreeCreate?: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(p.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayName = p.name ?? p.prompt.slice(0, 55) + (p.prompt.length > 55 ? "…" : "")

  return (
    <div className={`rounded-2xl border transition-colors ${isEditing ? "border-violet-500/30 bg-violet-500/[0.03]" : "border-white/[0.07] bg-[#0d1016] hover:border-white/[0.12]"}`}>
      {/* Card header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/80 font-medium truncate">{displayName}</p>
          {p.name && (
            <p className="text-[11px] text-white/35 mt-0.5 line-clamp-2 leading-relaxed">{p.prompt.slice(0, 120)}{p.prompt.length > 120 ? "…" : ""}</p>
          )}
          {/* Badges */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {p.producer_slug && (
              <span className="text-[9px] border border-white/[0.08] px-1.5 py-0.5 rounded text-white/35">{p.producer_slug}</span>
            )}
            {p.style_bucket && (
              <span className="text-[9px] border border-violet-500/20 px-1.5 py-0.5 rounded text-violet-400/60">{p.style_bucket}</span>
            )}
            {p.category && (
              <span className="text-[9px] border border-white/[0.06] px-1.5 py-0.5 rounded text-white/25">{p.category}</span>
            )}
            {p.ctr_score != null && (
              <span className={`text-[9px] font-mono ${p.ctr_score >= 70 ? "text-emerald-400" : p.ctr_score >= 50 ? "text-amber-400" : "text-white/30"}`}>
                CTR:{p.ctr_score}
              </span>
            )}
            {p.use_count > 0 && (
              <span className="text-[9px] text-white/20">used {p.use_count}×</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-none">
          {/* Favorite */}
          <button
            type="button"
            onClick={onToggleFavorite}
            disabled={isPending}
            title={p.favorite ? "Remove from favorites" : "Add to favorites"}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors ${p.favorite ? "text-amber-400 bg-amber-400/10" : "text-white/20 hover:text-amber-400/60 hover:bg-white/[0.04]"}`}
          >
            ★
          </button>
          {/* Winner */}
          <button
            type="button"
            onClick={onToggleWinner}
            disabled={isPending}
            title={p.winner_bool ? "Remove winner mark" : "Mark as winner"}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors ${p.winner_bool ? "text-yellow-400 bg-yellow-400/10" : "text-white/20 hover:text-yellow-400/60 hover:bg-white/[0.04]"}`}
          >
            🏆
          </button>
          {/* Use in Job Mode */}
          {onUseInJobMode && (
            <button
              type="button"
              onClick={onUseInJobMode}
              title="Use this prompt in Job Mode"
              className="h-7 px-2 rounded-lg flex items-center justify-center text-[9px] font-mono text-violet-400/60 hover:text-violet-400 hover:bg-violet-500/[0.08] transition-colors whitespace-nowrap"
            >
              Job
            </button>
          )}
          {/* Use in Free Create */}
          {onUseInFreeCreate && (
            <button
              type="button"
              onClick={onUseInFreeCreate}
              title="Use this prompt in Free Create"
              className="h-7 px-2 rounded-lg flex items-center justify-center text-[9px] font-mono text-sky-400/60 hover:text-sky-400 hover:bg-sky-500/[0.08] transition-colors whitespace-nowrap"
            >
              Free
            </button>
          )}
          {/* Copy */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy prompt"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
          >
            {copied ? "✓" : "⎘"}
          </button>
          {/* Edit */}
          <button
            type="button"
            onClick={isEditing ? onCancelEdit : onEdit}
            title={isEditing ? "Cancel edit" : "Edit prompt"}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] transition-colors ${isEditing ? "text-violet-400 bg-violet-400/10" : "text-white/25 hover:text-white/60 hover:bg-white/[0.04]"}`}
          >
            ✎
          </button>
          {/* Duplicate */}
          <button
            type="button"
            onClick={onDuplicate}
            disabled={isPending}
            title="Duplicate"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] text-white/20 hover:text-white/50 hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
          >
            ⊕
          </button>
          {/* Archive / Restore */}
          {isArchived ? (
            <button
              type="button"
              onClick={onRestore}
              disabled={isPending}
              title="Restore prompt"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-400/[0.06] disabled:opacity-40 transition-colors"
            >
              ↺
            </button>
          ) : (
            <button
              type="button"
              onClick={onArchive}
              disabled={isPending}
              title="Archive prompt"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] text-white/20 hover:text-white/50 hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
            >
              ▽
            </button>
          )}
          {/* Delete */}
          <button
            type="button"
            onClick={onDeleteRequest}
            title="Delete permanently"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] text-white/15 hover:text-red-400/60 hover:bg-red-500/[0.06] transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3">
          <div>
            <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Name</label>
            <input
              type="text"
              value={editDraft.name}
              onChange={(e) => onEditDraftChange({ ...editDraft, name: e.target.value })}
              placeholder="Human-readable name…"
              className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Prompt *</label>
            <textarea
              value={editDraft.prompt}
              onChange={(e) => onEditDraftChange({ ...editDraft, prompt: e.target.value })}
              rows={5}
              className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 resize-none font-mono leading-relaxed"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Style Bucket</label>
              <select
                value={editDraft.styleBucket}
                onChange={(e) => onEditDraftChange({ ...editDraft, styleBucket: e.target.value })}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
              >
                <option value="">— None —</option>
                {["MindLoft Sessions","Buffalo Noir","Jazz Smoke","Harlem Private Society","Museum Nights","Street Prestige"].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Category</label>
              <input
                type="text"
                value={editDraft.category}
                onChange={(e) => onEditDraftChange({ ...editDraft, category: e.target.value })}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">CTR Score</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editDraft.ctrScore}
                onChange={(e) => onEditDraftChange({ ...editDraft, ctrScore: e.target.value })}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-[0.18em] text-white/30 mb-1">Description / Notes</label>
            <textarea
              value={editDraft.description}
              onChange={(e) => onEditDraftChange({ ...editDraft, description: e.target.value })}
              rows={2}
              placeholder="When to use this prompt, what makes it effective…"
              className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={isPending}
              className="px-5 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2 text-sm text-white/35 hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
