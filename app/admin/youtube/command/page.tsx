import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import {
  getTodaySummary,
  get30DayCalendar,
  getProducerHealth,
  getSystemHealth,
  getFailedJobsPanel,
  getQueueBottleneck,
  getAppleMusicSyncHealth,
  type ProducerHealthLabel,
  type CalendarDay,
} from "@/lib/db/commandPanel"

export const metadata = { title: "Command Panel — SUMG Admin" }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString()
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function ageLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(h / 24)
  if (d > 1) return `${d}d ago`
  if (h > 1) return `${h}h ago`
  return "< 1h ago"
}

const HEALTH_STYLE: Record<ProducerHealthLabel, { dot: string; label: string; text: string }> = {
  healthy:      { dot: "bg-emerald-400",  label: "Healthy",      text: "text-emerald-400/70" },
  low_queue:    { dot: "bg-yellow-400",   label: "Low Queue",    text: "text-yellow-400/70"  },
  blocked:      { dot: "bg-orange-400",   label: "Blocked",      text: "text-orange-400/70"  },
  disconnected: { dot: "bg-red-500",      label: "Disconnected", text: "text-red-400/70"     },
  failing:      { dot: "bg-red-500",      label: "Failing",      text: "text-red-400/70"     },
}

const STATUS_STYLE: Record<string, string> = {
  scheduled:    "text-blue-400/70   border-blue-500/20",
  pending:      "text-amber-400/70  border-amber-500/20",
  uploaded:     "text-emerald-400/70 border-emerald-500/25",
  needs_asset:  "text-orange-400/60 border-orange-500/20",
  needs_render: "text-violet-400/60 border-violet-500/20",
}

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? "text-white/30 border-white/10"
  return (
    <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="border border-white/[0.07] bg-[#0d1016] p-4 rounded-xl">
      <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-2">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${accent ?? "text-white"}`}>{value}</p>
    </div>
  )
}

// ─── Calendar strip ────────────────────────────────────────────────────────────

function CalendarStrip({ days }: { days: CalendarDay[] }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const relevant = days.filter((d) => d.jobs.length > 0 || d.date === todayStr).slice(0, 30)

  if (relevant.length === 0) {
    return <p className="text-sm text-white/25 py-6 text-center">No scheduled uploads in the next 30 days.</p>
  }

  return (
    <div className="space-y-3">
      {relevant.map((day) => {
        const isToday = day.date === todayStr
        return (
          <div key={day.date}>
            <p className={`text-[9px] uppercase tracking-[0.2em] mb-2 ${isToday ? "text-white/60" : "text-white/25"}`}>
              {isToday ? "Today" : fmtDate(day.date + "T12:00:00")}
              <span className="ml-2 text-white/20">{day.jobs.length} job{day.jobs.length !== 1 ? "s" : ""}</span>
            </p>
            {day.jobs.length === 0 ? (
              <p className="text-[10px] text-white/15 pl-2">—</p>
            ) : (
              <div className="space-y-1.5">
                {day.jobs.map((job) => (
                  <div key={job.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/[0.05] bg-white/[0.02] flex-wrap">
                    <span className="text-[10px] font-mono text-white/40 shrink-0">{fmtTime(job.scheduledAt)}</span>
                    <StatusPill status={job.status} />
                    <span className="text-[11px] text-white/70 truncate flex-1 min-w-0">
                      {job.title ?? "(untitled)"}
                    </span>
                    <span className="text-[10px] text-white/30 shrink-0">{job.producerSlug}</span>
                    {job.channelHandle && (
                      <span className="text-[10px] text-white/20 shrink-0">{job.channelHandle}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CommandPanelPage() {
  await requireAdmin()

  const [today, calendar, producerHealth, sysHealth, failedJobs, bottleneck, appleSync] =
    await Promise.all([
      getTodaySummary(),
      get30DayCalendar(),
      getProducerHealth(),
      getSystemHealth(),
      getFailedJobsPanel(),
      getQueueBottleneck(),
      getAppleMusicSyncHealth(),
    ])

  const linkedPct = (h: { total: number; linked: number }) =>
    h.total === 0 ? "—" : `${Math.round((h.linked / h.total) * 100)}%`

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl space-y-10">

      {/* Header */}
      <div>
        <Link href="/admin/youtube"
          className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition mb-3 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">Command Panel</h1>
        <p className="text-xs text-white/35 mt-1">Live view of the upload pipeline, producer health, and catalog sync.</p>
      </div>

      {/* ── 1. Today summary ──────────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">Today</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Uploaded"  value={fmt(today.uploadedToday)}  accent="text-emerald-400" />
          <Stat label="Scheduled" value={fmt(today.scheduledToday)} accent="text-blue-400" />
          <Stat label="Queue"     value={fmt(today.queueDepth)} />
          <Stat label="Failed"    value={fmt(today.failedTotal)}    accent={today.failedTotal > 0 ? "text-red-400" : undefined} />
          <Stat label="Needs Asset"  value={fmt(today.needsAsset)} />
          <Stat label="Needs Render" value={fmt(today.needsRender)} />
        </div>
      </section>

      {/* ── 2. System health bar ──────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">System Health</p>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5">
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {[
              { label: "Channels",        value: `${sysHealth.activeChannels} active / ${sysHealth.totalChannels} total` },
              { label: "OAuth Connected", value: `${sysHealth.oauthChannels} / ${sysHealth.totalChannels}`,
                accent: sysHealth.oauthChannels < sysHealth.totalChannels ? "text-yellow-400/80" : "text-emerald-400/80" },
              { label: "Pending / Sched", value: fmt(sysHealth.pendingScheduled) },
              { label: "Processing",      value: fmt(sysHealth.processing) },
              { label: "Needs Asset",     value: fmt(sysHealth.needsAsset),
                accent: sysHealth.needsAsset > 0 ? "text-orange-400/80" : undefined },
              { label: "Needs Render",    value: fmt(sysHealth.needsRender),
                accent: sysHealth.needsRender > 0 ? "text-violet-400/80" : undefined },
              { label: "Failed",          value: fmt(sysHealth.failedJobs),
                accent: sysHealth.failedJobs > 0 ? "text-red-400/80" : undefined },
              { label: "Total Uploaded",  value: fmt(sysHealth.uploaded), accent: "text-emerald-400/80" },
            ].map(({ label, value, accent }) => (
              <div key={label}>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/25 mb-1">{label}</p>
                <p className={`text-base font-semibold tabular-nums ${accent ?? "text-white/70"}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Producer health cards ──────────────────────────────────────── */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">
          Producer Health
          <span className="ml-2 text-white/20 normal-case text-[9px]">{producerHealth.length} channel{producerHealth.length !== 1 ? "s" : ""}</span>
        </p>
        {producerHealth.length === 0 ? (
          <p className="text-sm text-white/25">No channels configured.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {producerHealth.map((ph) => {
              const hs = HEALTH_STYLE[ph.healthLabel]
              return (
                <div key={ph.channelId}
                  className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">
                        {ph.channelHandle ?? ph.channelId}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">{ph.producerSlug} · {ph.uploadCadence}/day</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${hs.dot}`} />
                      <span className={`text-[9px] ${hs.text}`}>{hs.label}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Today",   value: ph.uploadedToday,      color: "text-emerald-400/80" },
                      { label: "7d Sched", value: ph.scheduledNext7Days, color: "text-blue-400/70" },
                      { label: "Queue",    value: ph.queueDepth,         color: ph.queueDepth < 3 ? "text-yellow-400/70" : "text-white/60" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="border border-white/[0.06] rounded-lg py-2">
                        <p className={`text-base font-semibold tabular-nums ${color}`}>{value}</p>
                        <p className="text-[9px] text-white/25 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ph.needsRender > 0 && (
                      <span className="text-[9px] border border-violet-500/20 text-violet-400/60 px-1.5 py-0.5 rounded">
                        {ph.needsRender} needs render
                      </span>
                    )}
                    {ph.failedJobs > 0 && (
                      <span className="text-[9px] border border-red-500/20 text-red-400/60 px-1.5 py-0.5 rounded">
                        {ph.failedJobs} failed
                      </span>
                    )}
                    {!ph.oauthConnected && (
                      <span className="text-[9px] border border-red-500/20 text-red-400/60 px-1.5 py-0.5 rounded">
                        No OAuth
                      </span>
                    )}
                    {ph.oauthConnected && ph.failedJobs === 0 && ph.needsRender === 0 && (
                      <span className="text-[9px] border border-emerald-500/20 text-emerald-400/50 px-1.5 py-0.5 rounded">
                        OAuth ✓
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 4. 30-Day upload calendar ─────────────────────────────────────── */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">
          30-Day Upload Calendar
        </p>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5">
          <CalendarStrip days={calendar} />
        </div>
      </section>

      {/* ── 5. Failed jobs panel ──────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">
          Failed Jobs
          {failedJobs.length > 0 && (
            <span className="ml-2 text-red-400/60 text-[9px]">{failedJobs.length}</span>
          )}
        </p>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          {failedJobs.length === 0 ? (
            <p className="text-sm text-white/25 py-6 text-center">No failed jobs.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {failedJobs.map((job) => (
                <div key={job.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{job.title ?? "(untitled)"}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {job.producerSlug}
                      {job.channelHandle ? ` · ${job.channelHandle}` : ""}
                      {" · "}retry {job.retryCount}
                      {" · "}
                      {ageLabel(job.updatedAt)}
                    </p>
                    {job.errorMessage && (
                      <p className="mt-1 text-[10px] font-mono text-red-400/50 truncate">{job.errorMessage}</p>
                    )}
                  </div>
                  <Link
                    href={`/admin/youtube/jobs`}
                    className="text-[10px] text-white/25 hover:text-white/50 transition shrink-0"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 6. Queue bottleneck panel ─────────────────────────────────────── */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">
          Queue Bottlenecks
          <span className="ml-2 text-white/20 text-[9px]">needs_asset / needs_render — oldest first</span>
        </p>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          {bottleneck.length === 0 ? (
            <p className="text-sm text-white/25 py-6 text-center">No bottlenecks — queue is clear.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {bottleneck.map((job) => (
                <div key={job.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-white/70 truncate">{job.title ?? "(untitled)"}</p>
                      <StatusPill status={job.status} />
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {job.producerSlug}
                      {job.channelHandle ? ` · ${job.channelHandle}` : ""}
                      {" · stuck "}
                      {ageLabel(job.createdAt)}
                    </p>
                  </div>
                  <Link
                    href={job.status === "needs_asset" ? "/admin/youtube/queue" : "/admin/youtube/render"}
                    className="text-[10px] text-white/25 hover:text-white/50 transition shrink-0"
                  >
                    {job.status === "needs_asset" ? "Assign Asset →" : "Render →"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 7. Apple Music sync health ────────────────────────────────────── */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Apple Music Catalog Sync</p>
        <p className="text-[10px] text-white/20 mb-4">
          Last-sync tracking is not yet implemented — showing link coverage only.{" "}
          <Link href="/admin/apple-music" className="text-white/35 hover:text-white/55 transition">
            Manage links →
          </Link>
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              { label: "Artists",  h: appleSync.artists  },
              { label: "Releases", h: appleSync.releases },
              { label: "Songs",    h: appleSync.songs    },
            ] as const
          ).map(({ label, h }) => (
            <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-3">{label}</p>
              <div className="flex items-end justify-between gap-2 mb-2">
                <p className="text-2xl font-semibold tabular-nums text-white/80">{h.linked}</p>
                <p className="text-[10px] text-white/25 mb-0.5">/ {h.total} linked ({linkedPct(h)})</p>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-white/[0.06] rounded-full h-1 overflow-hidden">
                <div
                  className="h-1 rounded-full bg-rose-500/50 transition-all"
                  style={{ width: h.total === 0 ? "0%" : `${Math.round((h.linked / h.total) * 100)}%` }}
                />
              </div>
              {h.missing > 0 && (
                <p className="mt-2 text-[10px] text-orange-400/50">{h.missing} missing</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[9px] text-white/15 leading-relaxed">
          Apple Music does not provide a public sync API. Last-synced timestamps are not tracked.
          To add tracking, run a migration to add <span className="font-mono">apple_music_last_synced_at</span> columns to artists, releases, and songs.
        </p>
      </section>

    </div>
  )
}
