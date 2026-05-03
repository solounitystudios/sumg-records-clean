import Link from "next/link"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const metadata = { title: "Activity Log — SUMG Admin" }

interface ActivityEvent {
  id: string
  at: string
  type: "import" | "upload" | "release" | "artist" | "inbox" | "finance"
  title: string
  detail: string
  href?: string
  status?: "success" | "warning" | "error" | "neutral"
}

async function getRecentActivity(limit = 60): Promise<ActivityEvent[]> {
  await requireAdmin()

  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()

  const [importsRes, ytJobsRes, releasesRes, inboxRes, financeRes] = await Promise.all([
    supabase.from("import_logs").select("id, import_type, filename, imported_at, total_rows, updated_rows, error_count").gte("imported_at", cutoff).order("imported_at", { ascending: false }).limit(20),
    supabase.from("yt_upload_jobs").select("id, title, producer_slug, status, uploaded_at, updated_at").in("status", ["uploaded", "failed"]).gte("updated_at", cutoff).order("updated_at", { ascending: false }).limit(20),
    supabase.from("releases").select("id, title, slug, status, artist_name, updated_at").gte("updated_at", cutoff).order("updated_at", { ascending: false }).limit(15),
    supabase.from("audio_inbox").select("id, status, updated_at, asset_id").in("status", ["uploaded", "ready_to_schedule", "scheduled"]).gte("updated_at", cutoff).order("updated_at", { ascending: false }).limit(15),
    supabase.from("finance_transactions").select("id, type, amount, currency, description, transaction_date, created_at").gte("created_at", cutoff).order("created_at", { ascending: false }).limit(10),
  ])

  const events: ActivityEvent[] = []

  for (const log of importsRes.data ?? []) {
    events.push({
      id: `import-${log.id}`,
      at: log.imported_at,
      type: "import",
      title: `${log.import_type.toUpperCase()} import · ${log.filename}`,
      detail: `${log.total_rows} rows · ${log.updated_rows} updated${log.error_count > 0 ? ` · ${log.error_count} errors` : ""}`,
      href: "/admin/imports",
      status: log.error_count > 0 ? "warning" : "success",
    })
  }

  for (const job of ytJobsRes.data ?? []) {
    events.push({
      id: `yt-${job.id}`,
      at: job.uploaded_at ?? job.updated_at,
      type: "upload",
      title: job.title ?? "Untitled upload",
      detail: `${job.producer_slug} · ${job.status}`,
      href: job.status === "failed" ? "/admin/youtube/jobs?status=failed" : "/admin/youtube/jobs",
      status: job.status === "uploaded" ? "success" : "error",
    })
  }

  for (const release of releasesRes.data ?? []) {
    events.push({
      id: `release-${release.id}`,
      at: release.updated_at,
      type: "release",
      title: release.title,
      detail: `${release.artist_name} · ${release.status}`,
      href: `/admin/releases/${release.slug}/edit`,
      status: release.status === "published" ? "success" : "neutral",
    })
  }

  for (const inbox of inboxRes.data ?? []) {
    events.push({
      id: `inbox-${inbox.id}`,
      at: inbox.updated_at,
      type: "inbox",
      title: `Audio ${inbox.status.replace(/_/g, " ")}`,
      detail: inbox.asset_id ?? inbox.id,
      href: "/admin/youtube/inbox",
      status: inbox.status === "uploaded" ? "success" : "neutral",
    })
  }

  for (const tx of financeRes.data ?? []) {
    const amt = new Intl.NumberFormat("en-US", { style: "currency", currency: tx.currency ?? "USD" }).format(Number(tx.amount))
    events.push({
      id: `finance-${tx.id}`,
      at: tx.created_at,
      type: "finance",
      title: tx.description || `${tx.type} transaction`,
      detail: `${tx.type === "income" ? "+" : "-"}${amt}`,
      href: "/admin/finance",
      status: tx.type === "income" ? "success" : "neutral",
    })
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

const typeConfig = {
  import:  { label: "IMPORT",  color: "text-sky-400/70",     dot: "bg-sky-400/60" },
  upload:  { label: "UPLOAD",  color: "text-red-400/70",     dot: "bg-red-400/60" },
  release: { label: "RELEASE", color: "text-emerald-400/70", dot: "bg-emerald-400/60" },
  artist:  { label: "ARTIST",  color: "text-purple-400/70",  dot: "bg-purple-400/60" },
  inbox:   { label: "INBOX",   color: "text-blue-400/70",    dot: "bg-blue-400/60" },
  finance: { label: "FINANCE", color: "text-amber-400/70",   dot: "bg-amber-400/60" },
}

const statusDot = {
  success: "bg-emerald-400/60",
  warning: "bg-amber-400/60",
  error:   "bg-red-400/60",
  neutral: "bg-white/20",
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default async function ActivityPage() {
  const events = await getRecentActivity()

  // Group by date
  const byDate: Record<string, ActivityEvent[]> = {}
  for (const e of events) {
    const date = new Date(e.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(e)
  }

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / System</p>
          <h1 className="text-3xl font-semibold tracking-tight">Activity Log</h1>
          <p className="mt-2 text-sm text-white/40">Last 30 days · {events.length} events</p>
        </div>
        <Link href="/admin/command-center" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">← Command Center</Link>
      </div>

      {events.length === 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-12 text-center">
          <p className="text-sm text-white/25 font-mono">No activity in the last 30 days.</p>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(byDate).map(([date, dayEvents]) => (
          <div key={date}>
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-mono mb-3">{date}</p>
            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] overflow-hidden">
              {dayEvents.map((event, i) => {
                const cfg = typeConfig[event.type]
                const dot = event.status ? statusDot[event.status] : statusDot.neutral
                const inner = (
                  <div className={`flex items-start gap-4 px-5 py-3.5 ${i > 0 ? "border-t border-white/[0.04]" : ""} ${event.href ? "hover:bg-white/[0.02] transition-colors duration-150" : ""}`}>
                    <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-mono tracking-[0.15em] ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-sm text-white/65 truncate">{event.title}</span>
                      </div>
                      <p className="text-[10px] text-white/30 font-mono mt-0.5">{event.detail}</p>
                    </div>
                    <span className="text-[9px] text-white/20 font-mono shrink-0 pt-0.5">{relativeTime(event.at)}</span>
                  </div>
                )
                if (event.href) {
                  return <Link key={event.id} href={event.href}>{inner}</Link>
                }
                return <div key={event.id}>{inner}</div>
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
