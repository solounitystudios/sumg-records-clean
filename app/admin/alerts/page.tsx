import Link from "next/link"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const metadata = { title: "Alerts — SUMG Admin" }

interface Alert {
  id: string
  severity: "critical" | "warning" | "info"
  category: string
  message: string
  href: string
  count?: number
  detail?: string
}

async function getAlerts(): Promise<Alert[]> {
  await requireAdmin()

  const [
    ytFailedRes,
    ytStuckRes,
    songsNoIsrcRes,
    songsNoAudioRes,
    artistsNoSpotifyRes,
    draftReleasesRes,
    inboxBlockedRes,
    channelsRevokedRes,
    songsNoLyricsRes,
  ] = await Promise.all([
    supabase.from("yt_upload_jobs").select("id, title, producer_slug, updated_at").eq("status", "failed").order("updated_at", { ascending: false }).limit(20),
    supabase.from("yt_upload_jobs").select("id", { count: "exact", head: true }).eq("status", "needs_asset").lt("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from("songs").select("id", { count: "exact", head: true }).is("isrc", null).neq("status", "archived"),
    supabase.from("songs").select("id", { count: "exact", head: true }).is("audio_url", null).neq("status", "archived"),
    supabase.from("artists").select("id", { count: "exact", head: true }).is("spotify_id", null).neq("status", "archived"),
    supabase.from("releases").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("audio_inbox").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
    supabase.from("yt_channels").select("id, channel_handle").eq("status", "revoked"),
    supabase.from("songs").select("id", { count: "exact", head: true }).is("lyrics", null).neq("status", "archived"),
  ])

  const alerts: Alert[] = []

  if ((ytFailedRes.data ?? []).length > 0) {
    alerts.push({
      id: "yt-failed",
      severity: "critical",
      category: "YouTube",
      message: `${ytFailedRes.data!.length} upload job${ytFailedRes.data!.length !== 1 ? "s" : ""} failed`,
      href: "/admin/youtube/jobs?status=failed",
      count: ytFailedRes.data!.length,
      detail: ytFailedRes.data!.slice(0, 3).map((j) => j.title ?? j.id).join(", "),
    })
  }

  if ((channelsRevokedRes.data ?? []).length > 0) {
    alerts.push({
      id: "channels-revoked",
      severity: "critical",
      category: "YouTube",
      message: `${channelsRevokedRes.data!.length} channel${channelsRevokedRes.data!.length !== 1 ? "s" : ""} OAuth revoked`,
      href: "/admin/youtube",
      count: channelsRevokedRes.data!.length,
      detail: channelsRevokedRes.data!.map((c) => c.channel_handle ?? c.id).join(", "),
    })
  }

  const stuckCount = ytStuckRes.count ?? 0
  if (stuckCount > 0) {
    alerts.push({
      id: "yt-stuck",
      severity: "warning",
      category: "YouTube",
      message: `${stuckCount} job${stuckCount !== 1 ? "s" : ""} stuck in needs_asset for 7+ days`,
      href: "/admin/youtube/queue?status=needs_asset",
      count: stuckCount,
    })
  }

  const inboxCount = inboxBlockedRes.count ?? 0
  if (inboxCount > 0) {
    alerts.push({
      id: "inbox-review",
      severity: "warning",
      category: "Audio Inbox",
      message: `${inboxCount} item${inboxCount !== 1 ? "s" : ""} awaiting review`,
      href: "/admin/youtube/inbox",
      count: inboxCount,
    })
  }

  const noIsrc = songsNoIsrcRes.count ?? 0
  if (noIsrc > 0) {
    alerts.push({
      id: "songs-no-isrc",
      severity: "warning",
      category: "Catalog",
      message: `${noIsrc} song${noIsrc !== 1 ? "s" : ""} missing ISRC`,
      href: "/admin/integrity",
      count: noIsrc,
      detail: "Required for royalty collection",
    })
  }

  const noAudio = songsNoAudioRes.count ?? 0
  if (noAudio > 0) {
    alerts.push({
      id: "songs-no-audio",
      severity: "warning",
      category: "Catalog",
      message: `${noAudio} song${noAudio !== 1 ? "s" : ""} missing audio file`,
      href: "/admin/integrity",
      count: noAudio,
    })
  }

  const draftCount = draftReleasesRes.count ?? 0
  if (draftCount > 0) {
    alerts.push({
      id: "draft-releases",
      severity: "info",
      category: "Releases",
      message: `${draftCount} draft release${draftCount !== 1 ? "s" : ""} not published`,
      href: "/admin/releases?status=draft",
      count: draftCount,
    })
  }

  const noSpotify = artistsNoSpotifyRes.count ?? 0
  if (noSpotify > 0) {
    alerts.push({
      id: "artists-no-spotify",
      severity: "info",
      category: "Artists",
      message: `${noSpotify} artist${noSpotify !== 1 ? "s" : ""} not linked to Spotify`,
      href: "/admin/spotify",
      count: noSpotify,
    })
  }

  const noLyrics = songsNoLyricsRes.count ?? 0
  if (noLyrics > 0) {
    alerts.push({
      id: "songs-no-lyrics",
      severity: "info",
      category: "Catalog",
      message: `${noLyrics} song${noLyrics !== 1 ? "s" : ""} missing lyrics`,
      href: "/admin/lyrics",
      count: noLyrics,
    })
  }

  return alerts
}

const severityConfig = {
  critical: {
    border: "border-red-500/25",
    bg: "bg-red-500/[0.04]",
    dot: "bg-red-400",
    badge: "bg-red-500/15 text-red-400 border-red-500/20",
    text: "text-red-400/80",
    label: "CRITICAL",
  },
  warning: {
    border: "border-amber-500/25",
    bg: "bg-amber-500/[0.04]",
    dot: "bg-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    text: "text-amber-400/80",
    label: "WARNING",
  },
  info: {
    border: "border-blue-500/20",
    bg: "bg-blue-500/[0.03]",
    dot: "bg-blue-400/60",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    text: "text-blue-400/70",
    label: "INFO",
  },
}

export default async function AlertsPage() {
  const alerts = await getAlerts()

  const critical = alerts.filter((a) => a.severity === "critical")
  const warning  = alerts.filter((a) => a.severity === "warning")
  const info     = alerts.filter((a) => a.severity === "info")

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / System</p>
          <h1 className="text-3xl font-semibold tracking-tight">Alerts</h1>
          <p className="mt-2 text-sm text-white/40">
            {alerts.length === 0 ? "All systems operational." : `${alerts.length} active alert${alerts.length !== 1 ? "s" : ""} across ${[critical.length > 0 && "critical", warning.length > 0 && "warning", info.length > 0 && "info"].filter(Boolean).join(", ")}.`}
          </p>
        </div>
        <Link href="/admin/command-center" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">← Command Center</Link>
      </div>

      {alerts.length === 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-16 text-center">
          <div className="text-2xl mb-3">✓</div>
          <p className="text-sm text-white/40 font-mono">No active alerts.</p>
          <p className="text-xs text-white/20 font-mono mt-1">All systems operational.</p>
        </div>
      )}

      {(["critical", "warning", "info"] as const).map((sev) => {
        const group = alerts.filter((a) => a.severity === sev)
        if (group.length === 0) return null
        const cfg = severityConfig[sev]
        return (
          <div key={sev} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono">{cfg.label} · {group.length}</p>
            </div>
            <div className="space-y-2">
              {group.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-all duration-150 hover:brightness-110 ${cfg.border} ${cfg.bg}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`mt-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${cfg.badge}`}>
                      {alert.category}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${cfg.text}`}>{alert.message}</p>
                      {alert.detail && <p className="text-[10px] text-white/30 font-mono mt-0.5 truncate">{alert.detail}</p>}
                    </div>
                  </div>
                  {alert.count !== undefined && (
                    <span className={`text-lg font-semibold font-mono tabular-nums shrink-0 ${cfg.text}`}>{alert.count}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </main>
  )
}
