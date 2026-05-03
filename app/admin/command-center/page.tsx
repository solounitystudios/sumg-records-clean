import Link from "next/link"
import { Suspense } from "react"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import { formatStreams } from "@/lib/data"

export const dynamic = "force-dynamic"
export const metadata = { title: "Command Center — SUMG Admin" }

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getLiveDashboardData() {
  await requireAdmin()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()
  const nowIso = new Date().toISOString()

  const [
    artistsRes,
    releasesRes,
    songsRes,
    streamsRes,
    ytTodayRes,
    ytFailedRes,
    ytQueueRes,
    inboxPendingRes,
    importLogsRes,
    financeRes,
    alertSongsRes,
    alertReleasesRes,
  ] = await Promise.all([
    supabase.from("artists").select("id, name, slug, status").neq("status", "archived"),
    supabase.from("releases").select("id, title, slug, status, artist_name, updated_at").order("updated_at", { ascending: false }).limit(5),
    supabase.from("songs").select("id", { count: "exact", head: true }),
    supabase.from("songs").select("streams").not("streams", "is", null),
    supabase.from("yt_upload_jobs").select("id", { count: "exact", head: true }).eq("status", "uploaded").gte("uploaded_at", todayIso),
    supabase.from("yt_upload_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("yt_upload_jobs").select("id", { count: "exact", head: true }).in("status", ["pending", "scheduled", "needs_render", "needs_asset"]),
    supabase.from("audio_inbox").select("id", { count: "exact", head: true }).in("status", ["new_asset", "needs_review", "needs_metadata", "needs_thumbnail", "needs_render"]),
    supabase.from("import_logs").select("id, import_type, filename, imported_at, total_rows, updated_rows").order("imported_at", { ascending: false }).limit(5),
    supabase.from("finance_transactions").select("type, amount").gte("transaction_date", today.toISOString().slice(0, 7) + "-01"),
    supabase.from("songs").select("id", { count: "exact", head: true }).or("isrc.is.null,audio_url.is.null"),
    supabase.from("releases").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ])

  const totalStreams = (streamsRes.data ?? []).reduce((s, r) => s + (r.streams ?? 0), 0)
  const monthlyIncome  = (financeRes.data ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0)
  const monthlyExpense = (financeRes.data ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0)

  return {
    artists:         artistsRes.data ?? [],
    recentReleases:  releasesRes.data ?? [],
    totalSongs:      songsRes.count ?? 0,
    totalStreams,
    ytUploadedToday: ytTodayRes.count ?? 0,
    ytFailed:        ytFailedRes.count ?? 0,
    ytQueue:         ytQueueRes.count ?? 0,
    inboxPending:    inboxPendingRes.count ?? 0,
    importLogs:      importLogsRes.data ?? [],
    monthlyIncome,
    monthlyExpense,
    catalogAlerts:   alertSongsRes.count ?? 0,
    draftReleases:   alertReleasesRes.count ?? 0,
  }
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  href,
  accent = "border-l-white/20",
  valueColor,
}: {
  label: string
  value: string | number
  sub?: string
  href?: string
  accent?: string
  valueColor?: string
}) {
  const inner = (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-5 transition-all duration-150 ${href ? "hover:border-white/15 hover:bg-white/[0.03]" : ""}`}>
      <div className={`absolute inset-y-0 left-0 w-[2px] rounded-l-2xl ${accent}`} />
      <div className="text-[9px] uppercase tracking-[0.25em] text-white/30 mb-2 font-mono">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums font-mono ${valueColor ?? "text-white/80"}`}>{value}</div>
      {sub && <div className="text-[9px] text-white/25 mt-1 font-mono">{sub}</div>}
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

function AlertBadge({ count, label, href, color }: { count: number; label: string; href: string; color: string }) {
  if (count === 0) return null
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-150 ${color}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
        <span className="text-xs font-mono">{label}</span>
      </div>
      <span className="text-xs font-mono font-semibold tabular-nums">{count}</span>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CommandCenterPage() {
  const d = await getLiveDashboardData()

  const activeArtists    = d.artists.filter((a) => !a.status || a.status === "active")
  const netThisMonth     = d.monthlyIncome - d.monthlyExpense
  const hasAlerts        = d.ytFailed > 0 || d.catalogAlerts > 0 || d.draftReleases > 0
  const nowStr           = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })

  return (
    <main className="px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight">Command Center</h1>
          <p className="mt-2 text-sm text-white/40 font-mono">
            <span className="text-emerald-400/70">● LIVE</span>
            <span className="text-white/20 ml-3">{nowStr}</span>
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Link href="/admin/alerts" className="rounded-full border border-white/15 px-4 py-2 text-xs font-mono text-white/50 hover:border-white/30 hover:text-white/80 transition-all duration-150">
            Alerts {hasAlerts && <span className="ml-1 text-amber-400">⚑</span>}
          </Link>
          <Link href="/admin/activity" className="rounded-full border border-white/15 px-4 py-2 text-xs font-mono text-white/50 hover:border-white/30 hover:text-white/80 transition-all duration-150">
            Activity Log
          </Link>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Artists" value={activeArtists.length} href="/admin/artists" accent="border-l-emerald-500/50" />
        <StatCard label="Total Songs"    value={d.totalSongs}         href="/admin/songs"   accent="border-l-sky-500/40" />
        <StatCard label="Total Streams"  value={formatStreams(d.totalStreams)} href="/admin/imports" accent="border-l-purple-500/40" />
        <StatCard label="Net This Month" value={`$${netThisMonth.toLocaleString()}`} href="/admin/finance" accent={netThisMonth >= 0 ? "border-l-emerald-500/50" : "border-l-red-500/40"} valueColor={netThisMonth >= 0 ? "text-emerald-400" : "text-red-400"} />
      </div>

      {/* Operations row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="YT Uploaded Today" value={d.ytUploadedToday} href="/admin/youtube/jobs?status=uploaded" accent="border-l-red-500/40" />
        <StatCard label="YT Queue"          value={d.ytQueue}          href="/admin/youtube/queue"                accent="border-l-amber-500/40" />
        <StatCard label="Audio Inbox"       value={d.inboxPending}     href="/admin/youtube/inbox"               accent="border-l-blue-500/40" sub="pending review" />
        <StatCard label="YT Failed"         value={d.ytFailed}         href="/admin/youtube/jobs?status=failed"  accent={d.ytFailed > 0 ? "border-l-red-400/70" : "border-l-white/10"} valueColor={d.ytFailed > 0 ? "text-red-400" : undefined} />
      </div>

      {/* Alerts strip */}
      {hasAlerts && (
        <div className="mb-8 space-y-2">
          <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono mb-3">Active Alerts</p>
          <AlertBadge count={d.ytFailed}      label="YouTube upload failures"    href="/admin/youtube/jobs?status=failed"  color="border-red-500/20 bg-red-500/[0.04] text-red-400/70 hover:border-red-500/40" />
          <AlertBadge count={d.catalogAlerts} label="Songs missing ISRC / audio" href="/admin/integrity"                   color="border-amber-500/20 bg-amber-500/[0.04] text-amber-400/70 hover:border-amber-500/40" />
          <AlertBadge count={d.draftReleases} label="Draft releases not published" href="/admin/releases?status=draft"    color="border-blue-500/20 bg-blue-500/[0.04] text-blue-400/70 hover:border-blue-500/40" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent releases */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono">Recent Releases</p>
            <Link href="/admin/releases" className="text-[9px] font-mono text-white/25 hover:text-white/60 transition-colors duration-150">View All →</Link>
          </div>
          <div className="space-y-2">
            {d.recentReleases.map((r) => (
              <Link
                key={r.id}
                href={`/admin/releases/${r.slug}/edit`}
                className="flex items-center justify-between px-3 py-2 -mx-3 rounded-xl hover:bg-white/[0.04] transition-all duration-150 group"
              >
                <div>
                  <p className="text-xs text-white/70 group-hover:text-white/90 transition-colors duration-150">{r.title}</p>
                  <p className="text-[10px] text-white/30 font-mono">{r.artist_name}</p>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  r.status === "published" ? "border-emerald-500/20 text-emerald-400/70 bg-emerald-500/[0.06]" :
                  r.status === "scheduled" ? "border-amber-500/20 text-amber-400/70" :
                  "border-white/10 text-white/30"
                }`}>{r.status}</span>
              </Link>
            ))}
            {d.recentReleases.length === 0 && <p className="text-xs text-white/20 font-mono">No releases yet.</p>}
          </div>
        </div>

        {/* Recent imports */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 font-mono">Recent Imports</p>
            <Link href="/admin/imports" className="text-[9px] font-mono text-white/25 hover:text-white/60 transition-colors duration-150">Import Data →</Link>
          </div>
          {d.importLogs.length > 0 ? (
            <div className="space-y-2">
              {d.importLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-3 py-2 -mx-3">
                  <div>
                    <p className="text-xs text-white/60 font-mono">{log.filename}</p>
                    <p className="text-[9px] text-white/25 font-mono">{new Date(log.imported_at).toLocaleDateString()} · {log.import_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-400/70 font-mono tabular-nums">{log.updated_rows} updated</p>
                    <p className="text-[9px] text-white/25 font-mono tabular-nums">{log.total_rows} rows</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/20 font-mono">No imports yet. <Link href="/admin/imports" className="text-sky-400/50 hover:text-sky-400/80">Import now →</Link></p>
          )}
        </div>
      </div>

      {/* Quick nav */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Content Generator", href: "/admin/content-gen", accent: "hover:border-purple-500/30" },
          { label: "Revenue",           href: "/admin/revenue",      accent: "hover:border-emerald-500/30" },
          { label: "Integrity Check",   href: "/admin/integrity",    accent: "hover:border-amber-500/30" },
          { label: "Import Data",       href: "/admin/imports",      accent: "hover:border-sky-500/30" },
        ].map(({ label, href, accent }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-xl border border-white/[0.07] bg-[#0a0c10] px-4 py-3 text-xs font-mono text-white/40 transition-all duration-150 hover:text-white/70 hover:bg-white/[0.03] ${accent}`}
          >
            {label} →
          </Link>
        ))}
      </div>
    </main>
  )
}
