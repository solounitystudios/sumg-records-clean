import Link from "next/link"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const metadata = { title: "Queues — SUMG Admin" }

interface QueueRow {
  status: string
  count: number
  tone: "neutral" | "warn" | "danger" | "ok"
}

interface QueueSection {
  key: string
  label: string
  href: string
  table: string
  reachable: boolean
  total: number
  rows: QueueRow[]
  failedExamples: Array<{ id: string; title: string; updated_at: string }>
}

const STATUS_TONE: Record<string, QueueRow["tone"]> = {
  failed:        "danger",
  cancelled:     "warn",
  needs_asset:   "warn",
  needs_render:  "warn",
  needs_review:  "warn",
  rendering:     "neutral",
  pending:       "neutral",
  processing:    "neutral",
  scheduled:     "neutral",
  uploaded:      "ok",
  ready:         "ok",
  ready_to_schedule: "ok",
}

const TONE_CLASS: Record<QueueRow["tone"], string> = {
  ok:      "text-emerald-400/80",
  neutral: "text-white/55",
  warn:    "text-amber-400/80",
  danger:  "text-red-400/80",
}

const TONE_DOT: Record<QueueRow["tone"], string> = {
  ok:      "bg-emerald-400/70",
  neutral: "bg-white/30",
  warn:    "bg-amber-400/70",
  danger:  "bg-red-400/70",
}

async function loadStatusBreakdown(table: string, statusCol = "status"): Promise<{ rows: QueueRow[]; total: number; reachable: boolean }> {
  try {
    const { data, error } = await supabase.from(table).select(statusCol).limit(10000)
    if (error || !data) return { rows: [], total: 0, reachable: false }
    const counts = new Map<string, number>()
    for (const row of data as unknown as Array<Record<string, unknown>>) {
      const s = String(row[statusCol] ?? "unknown")
      counts.set(s, (counts.get(s) ?? 0) + 1)
    }
    const rows: QueueRow[] = Array.from(counts.entries())
      .map(([status, count]) => ({ status, count, tone: STATUS_TONE[status] ?? "neutral" }))
      .sort((a, b) => {
        const order = { danger: 0, warn: 1, neutral: 2, ok: 3 } as const
        return order[a.tone] - order[b.tone] || b.count - a.count
      })
    return { rows, total: data.length, reachable: true }
  } catch {
    return { rows: [], total: 0, reachable: false }
  }
}

async function loadFailedExamples(table: string, titleCol: string, limit = 5): Promise<Array<{ id: string; title: string; updated_at: string }>> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${titleCol}, updated_at`)
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return (data as unknown as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ""),
      title: String(row[titleCol] ?? row.id ?? "Untitled"),
      updated_at: String(row.updated_at ?? ""),
    }))
  } catch {
    return []
  }
}

async function loadStuckExamples(table: string, titleCol: string, statuses: string[], olderThanDays: number, limit = 5): Promise<Array<{ id: string; title: string; updated_at: string }>> {
  try {
    const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString()
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${titleCol}, updated_at`)
      .in("status", statuses)
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(limit)
    if (error || !data) return []
    return (data as unknown as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ""),
      title: String(row[titleCol] ?? row.id ?? "Untitled"),
      updated_at: String(row.updated_at ?? ""),
    }))
  } catch {
    return []
  }
}

function relativeTime(iso: string): string {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default async function QueuesPage() {
  await requireAdmin()

  const [
    uploadBreakdown,
    thumbBreakdown,
    inboxBreakdown,
    uploadFailed,
    thumbFailed,
    uploadStuck,
  ] = await Promise.all([
    loadStatusBreakdown("yt_upload_jobs"),
    loadStatusBreakdown("thumbnail_generation_jobs"),
    loadStatusBreakdown("audio_inbox"),
    loadFailedExamples("yt_upload_jobs", "title"),
    loadFailedExamples("thumbnail_generation_jobs", "id"),
    loadStuckExamples("yt_upload_jobs", "title", ["needs_asset", "needs_render", "pending"], 7),
  ])

  const sections: QueueSection[] = [
    {
      key: "upload",
      label: "YouTube Upload Queue",
      href: "/admin/youtube/queue",
      table: "yt_upload_jobs",
      reachable: uploadBreakdown.reachable,
      total: uploadBreakdown.total,
      rows: uploadBreakdown.rows,
      failedExamples: uploadFailed,
    },
    {
      key: "thumb",
      label: "Thumbnail Generation",
      href: "/admin/youtube/thumbnail-studio",
      table: "thumbnail_generation_jobs",
      reachable: thumbBreakdown.reachable,
      total: thumbBreakdown.total,
      rows: thumbBreakdown.rows,
      failedExamples: thumbFailed,
    },
    {
      key: "inbox",
      label: "Audio Inbox",
      href: "/admin/youtube/inbox",
      table: "audio_inbox",
      reachable: inboxBreakdown.reachable,
      total: inboxBreakdown.total,
      rows: inboxBreakdown.rows,
      failedExamples: [],
    },
  ]

  const totalFailed = sections.reduce((s, sec) => s + (sec.rows.find((r) => r.status === "failed")?.count ?? 0), 0)
  const totalStuck = uploadStuck.length

  return (
    <main className="px-6 py-10 md:px-10 max-w-4xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / System</p>
          <h1 className="text-3xl font-semibold tracking-tight">Queues</h1>
          <p className="mt-2 text-sm text-white/40">
            Job queues across the platform.
            {totalFailed > 0 && <span className="text-red-400/70"> {totalFailed} failed.</span>}
            {totalStuck > 0 && <span className="text-amber-400/70"> {totalStuck} stuck 7+ days.</span>}
            {totalFailed === 0 && totalStuck === 0 && <span> No failed or stuck jobs.</span>}
          </p>
        </div>
        <Link href="/admin/system" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">← System Map</Link>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.key} className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-white/85">{section.label}</h2>
                <span className="text-[10px] font-mono text-white/30">{section.table}</span>
              </div>
              <Link href={section.href} className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150">
                Open →
              </Link>
            </div>

            {!section.reachable ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-white/30 font-mono">Source unreachable.</p>
                <p className="text-[11px] text-white/20 font-mono mt-1">Check that the {section.table} table exists.</p>
              </div>
            ) : section.total === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-white/35 font-mono">Queue empty.</p>
                <p className="text-[11px] text-white/20 font-mono mt-1">No jobs in {section.table} yet.</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {section.rows.map((row) => (
                    <div
                      key={row.status}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${TONE_DOT[row.tone]}`} />
                        <span className="text-[11px] text-white/55 font-mono truncate">{row.status}</span>
                      </span>
                      <span className={`text-sm font-mono tabular-nums ${TONE_CLASS[row.tone]}`}>{row.count}</span>
                    </div>
                  ))}
                </div>

                {section.failedExamples.length > 0 && (
                  <div className="px-6 pb-4">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-red-400/60 font-mono mb-2">
                      Failed · last {section.failedExamples.length}
                    </p>
                    <div className="rounded-lg border border-red-500/15 bg-red-500/[0.03] divide-y divide-white/[0.04]">
                      {section.failedExamples.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between gap-3 px-4 py-2">
                          <span className="text-xs text-white/60 truncate">{ex.title}</span>
                          <span className="text-[10px] text-white/25 font-mono shrink-0">{relativeTime(ex.updated_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        ))}

        {uploadStuck.length > 0 && (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-medium text-amber-400/80">Stuck — 7+ days without progress</h2>
              <p className="text-[11px] text-white/35 mt-0.5 font-mono">yt_upload_jobs · status in needs_asset, needs_render, pending</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {uploadStuck.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <span className="text-sm text-white/65 truncate">{ex.title}</span>
                  <span className="text-[10px] text-amber-400/60 font-mono shrink-0">{relativeTime(ex.updated_at)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
