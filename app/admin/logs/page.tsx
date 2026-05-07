import Link from "next/link"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const metadata = { title: "Logs — SUMG Admin" }

interface LogEntry {
  id: string
  at: string
  source: "engine" | "import"
  level: "info" | "warn" | "error"
  message: string
  detail?: string
  href?: string
}

async function getLogs(limit = 60): Promise<LogEntry[]> {
  await requireAdmin()

  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString()

  const [engineRes, importRes] = await Promise.all([
    supabase
      .from("yt_engine_logs")
      .select("id, level, message, created_at, job_id")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("import_logs")
      .select("id, import_type, filename, total_rows, updated_rows, error_count, imported_at")
      .gte("imported_at", cutoff)
      .order("imported_at", { ascending: false })
      .limit(20),
  ])

  const entries: LogEntry[] = []

  for (const row of engineRes.data ?? []) {
    entries.push({
      id: `engine-${row.id}`,
      at: row.created_at,
      source: "engine",
      level: (row.level as LogEntry["level"]) ?? "info",
      message: row.message,
      detail: row.job_id ? `job ${String(row.job_id).slice(0, 8)}` : undefined,
      href: row.job_id ? "/admin/youtube/jobs" : undefined,
    })
  }

  for (const row of importRes.data ?? []) {
    const hasErrors = (row.error_count ?? 0) > 0
    entries.push({
      id: `import-${row.id}`,
      at: row.imported_at,
      source: "import",
      level: hasErrors ? "warn" : "info",
      message: `${String(row.import_type).toUpperCase()} import — ${row.filename}`,
      detail: `${row.total_rows} rows · ${row.updated_rows} updated${hasErrors ? ` · ${row.error_count} errors` : ""}`,
      href: "/admin/imports",
    })
  }

  return entries
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

const LEVEL_COLOR: Record<LogEntry["level"], string> = {
  info:  "text-sky-400/70",
  warn:  "text-amber-400/80",
  error: "text-red-400/80",
}

const LEVEL_DOT: Record<LogEntry["level"], string> = {
  info:  "bg-sky-400/60",
  warn:  "bg-amber-400/70",
  error: "bg-red-400/70",
}

const SOURCE_LABEL: Record<LogEntry["source"], string> = {
  engine: "ENGINE",
  import: "IMPORT",
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default async function LogsPage() {
  const entries = await getLogs()

  const errorCount = entries.filter((e) => e.level === "error").length
  const warnCount  = entries.filter((e) => e.level === "warn").length

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / System</p>
          <h1 className="text-3xl font-semibold tracking-tight">Logs</h1>
          <p className="mt-2 text-sm text-white/40">
            Last 14 days · {entries.length} entries
            {errorCount > 0 && <span className="text-red-400/70"> · {errorCount} error{errorCount !== 1 ? "s" : ""}</span>}
            {warnCount > 0  && <span className="text-amber-400/70"> · {warnCount} warning{warnCount !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <Link href="/admin/activity" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">Activity →</Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-12 text-center">
          <p className="text-sm text-white/40 font-mono">No log entries in the last 14 days.</p>
          <p className="text-xs text-white/20 font-mono mt-1">Engine and import activity will surface here.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] overflow-hidden">
          {entries.map((entry, i) => {
            const inner = (
              <div className={`flex items-start gap-4 px-5 py-3.5 ${i > 0 ? "border-t border-white/[0.04]" : ""} ${entry.href ? "hover:bg-white/[0.02] transition-colors duration-150" : ""}`}>
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${LEVEL_DOT[entry.level]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-mono tracking-[0.15em] ${LEVEL_COLOR[entry.level]}`}>
                      {SOURCE_LABEL[entry.source]} · {entry.level.toUpperCase()}
                    </span>
                    <span className="text-sm text-white/65 truncate">{entry.message}</span>
                  </div>
                  {entry.detail && <p className="text-[10px] text-white/30 font-mono mt-0.5">{entry.detail}</p>}
                </div>
                <span className="text-[9px] text-white/20 font-mono shrink-0 pt-0.5">{relativeTime(entry.at)}</span>
              </div>
            )
            return entry.href ? (
              <Link key={entry.id} href={entry.href}>{inner}</Link>
            ) : (
              <div key={entry.id}>{inner}</div>
            )
          })}
        </div>
      )}

      <p className="text-[10px] text-white/20 font-mono mt-4">
        Sources: <span className="text-white/35">yt_engine_logs</span> ·{" "}
        <span className="text-white/35">import_logs</span>
      </p>
    </main>
  )
}
