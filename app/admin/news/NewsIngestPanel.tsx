"use client"

import { useState, useTransition } from "react"
import { fetchIndustryNewsFeeds } from "@/app/actions/newsIngest"
import { createNewsItem } from "@/app/actions/news"
import type { IngestedItem } from "@/app/actions/newsIngest"

const categoryStyle: Record<string, string> = {
  Release:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Visual:       "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Announcement: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Brand:        "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Business:     "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
}

export function NewsIngestPanel() {
  const [items, setItems]         = useState<IngestedItem[]>([])
  const [errors, setErrors]       = useState<{ source: string; error: string }[]>([])
  const [importing, setImporting] = useState<string | null>(null)
  const [imported, setImported]   = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen]       = useState(false)
  const [isFetching, startFetch]  = useTransition()
  const [isImporting, startImport] = useTransition()

  function handleFetch() {
    startFetch(async () => {
      const result = await fetchIndustryNewsFeeds()
      setItems(result.items)
      setErrors(result.errors)
      setIsOpen(true)
    })
  }

  function handleImport(item: IngestedItem) {
    const key = item.url
    setImporting(key)
    startImport(async () => {
      const fd = new FormData()
      fd.set("title", item.title)
      fd.set("slug", slugify(item.title) + "-" + Date.now().toString(36))
      fd.set("excerpt", item.excerpt)
      fd.set("date", item.date)
      fd.set("category", item.suggestedCategory)
      await createNewsItem(fd)
      setImported((prev) => new Set([...prev, key]))
      setImporting(null)
    })
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0c10] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-blue-400/60" />
            <span className="h-1 w-1 rounded-full bg-violet-400/60" />
            <span className="h-1 w-1 rounded-full bg-emerald-400/60" />
          </div>
          <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">
            Industry Feed Ingest
          </h2>
        </div>
        <button
          type="button"
          onClick={handleFetch}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-full border border-white/[0.12] px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 hover:border-white/25 hover:text-white/80 transition-all duration-150 disabled:opacity-40 disabled:cursor-wait"
        >
          {isFetching ? (
            <>
              <span className="h-1 w-1 rounded-full bg-white/50 animate-bounce" />
              Fetching…
            </>
          ) : (
            <>
              ↓ Fetch Feeds
            </>
          )}
        </button>
      </div>

      {/* Feed errors */}
      {errors.length > 0 && (
        <div className="px-5 py-3 border-b border-white/[0.04] flex flex-wrap gap-2">
          {errors.map((e) => (
            <span key={e.source} className="text-[9px] font-mono text-red-400/40 border border-red-500/10 px-2 py-0.5 rounded">
              {e.source}: {e.error}
            </span>
          ))}
        </div>
      )}

      {/* Feed items */}
      {isOpen && items.length === 0 && !isFetching && (
        <div className="px-5 py-8 text-center text-[11px] text-white/25 font-mono">
          No items fetched — check feed sources.
        </div>
      )}

      {isOpen && items.length > 0 && (
        <div className="divide-y divide-white/[0.04] max-h-[520px] overflow-y-auto">
          {items.map((item) => {
            const key     = item.url
            const done    = imported.has(key)
            const loading = importing === key && isImporting

            return (
              <div
                key={key}
                className={`px-5 py-4 transition-all duration-150 ${done ? "opacity-40" : "hover:bg-white/[0.02]"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[9px] border px-2 py-0.5 rounded font-mono ${categoryStyle[item.suggestedCategory] ?? "bg-white/5 text-white/30 border-white/10"}`}>
                        {item.suggestedCategory}
                      </span>
                      <span className="text-[9px] font-mono text-white/25">{item.source}</span>
                      <span className="text-[9px] font-mono text-white/20">{item.date}</span>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-white/80 hover:text-white transition-colors duration-150 line-clamp-1"
                    >
                      {item.title}
                    </a>
                    <p className="mt-1 text-[11px] text-white/35 leading-relaxed line-clamp-2">
                      {item.excerpt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !done && handleImport(item)}
                    disabled={done || loading}
                    className={`shrink-0 text-[9px] font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded border transition-all duration-150 ${
                      done
                        ? "border-emerald-500/20 text-emerald-400/40 cursor-default"
                        : loading
                        ? "border-white/10 text-white/20 cursor-wait"
                        : "border-white/[0.1] text-white/35 hover:border-white/25 hover:text-white/70"
                    }`}
                  >
                    {done ? "✓ Added" : loading ? "…" : "Add"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isOpen && (
        <div className="px-5 py-6 text-center">
          <p className="text-[11px] text-white/20 font-mono">
            Fetch live items from Pitchfork, Billboard, Rolling Stone, The FADER, Hypebeast
          </p>
        </div>
      )}
    </div>
  )
}
