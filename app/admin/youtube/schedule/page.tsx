import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getAllChannelScheduleStates } from "@/lib/youtube/scheduler"
import { getProducers } from "@/lib/db/producers"
import { ScheduleAllPanel, ScheduleChannelButton } from "@/components/admin/SchedulePanel"

export const metadata = { title: "Upload Schedule — SUMG Admin" }

function formatTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false }) + " UTC"
}

function SlotBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const color = pct >= 100 ? "bg-green-400" : pct > 0 ? "bg-sky-400" : "bg-white/10"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-white/30 flex-none tabular-nums">
        {used}/{total}
      </span>
    </div>
  )
}

export default async function ScheduleAdminPage() {
  await requireAdmin()

  const [states, producers] = await Promise.all([
    getAllChannelScheduleStates(),
    getProducers(),
  ])

  const producerMap = Object.fromEntries(producers.map((p) => [p.slug, p.name]))

  const totalCapacity     = states.reduce((s, c) => s + c.cadence, 0)
  const totalUploadedToday = states.reduce((s, c) => s + c.uploadsToday, 0)
  const totalScheduledToday = states.reduce((s, c) => s + c.scheduledToday, 0)
  const totalPending      = states.reduce((s, c) => s + c.pendingUnscheduled, 0)
  const activeChannels    = states.filter((c) => c.channelStatus === "active" && c.oauthConnected)

  const cronUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/youtube/cron`
    : "/api/youtube/cron"

  return (
    <div className="px-6 py-8 max-w-4xl space-y-10">
      {/* Header */}
      <div>
        <Link href="/admin/youtube" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">Upload Schedule</h1>
        <p className="text-xs text-white/35 mt-1">
          Distribute pending jobs across producer channels based on upload cadence.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Uploaded Today",  value: totalUploadedToday },
          { label: "Scheduled Today", value: totalScheduledToday },
          { label: "Daily Capacity",  value: `${totalCapacity}/day`, mono: true },
          { label: "Pending Queue",   value: totalPending },
        ].map(({ label, value, mono }) => (
          <div key={label} className="border border-white/[0.07] bg-[#0d1016] p-4 rounded-2xl">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-1.5">{label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${mono ? "font-mono" : ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Per-channel schedule cards */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">
          Channel Schedule
          <span className="ml-2 text-white/20">{states.length} channel{states.length !== 1 ? "s" : ""}</span>
        </p>

        {states.length === 0 ? (
          <p className="text-sm text-white/20 py-8 text-center">
            No channels configured. <Link href="/admin/youtube/channels" className="underline hover:text-white/50">Add a channel →</Link>
          </p>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            {states.map((ch, i) => {
              const totalUsed = ch.uploadsToday + ch.scheduledToday
              const canSchedule = ch.channelStatus === "active" && ch.oauthConnected && ch.slotsRemaining > 0 && ch.pendingUnscheduled > 0

              return (
                <div key={ch.channelDbId}
                  className={`px-5 py-5 ${i < states.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                  {/* Channel header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-white/80 font-medium truncate">
                          {ch.handle ?? ch.channelDbId}
                        </p>
                        <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide flex-none ${
                          ch.channelStatus === "active" ? "text-green-400/60 border-green-500/20" :
                          ch.channelStatus === "paused" ? "text-yellow-400/50 border-yellow-500/20" :
                          "text-red-400/50 border-red-500/20"
                        }`}>{ch.channelStatus}</span>
                        {!ch.oauthConnected && (
                          <span className="text-[9px] text-orange-400/60 border border-orange-500/20 px-1.5 py-0.5 rounded">no oauth</span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {producerMap[ch.producerSlug] ?? ch.producerSlug} · {ch.cadence} upload{ch.cadence !== 1 ? "s" : ""}/day
                      </p>
                    </div>

                    <ScheduleChannelButton channelId={ch.channelDbId} disabled={!canSchedule} />
                  </div>

                  {/* Slot bar */}
                  <SlotBar used={totalUsed} total={ch.cadence} />

                  {/* Detail row */}
                  <div className="flex flex-wrap gap-5 mt-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-white/20 mb-0.5">Uploaded</p>
                      <p className="text-sm font-medium tabular-nums text-green-400/70">{ch.uploadsToday}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-white/20 mb-0.5">Scheduled</p>
                      <p className="text-sm font-medium tabular-nums text-sky-400/70">{ch.scheduledToday}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-white/20 mb-0.5">Remaining</p>
                      <p className={`text-sm font-medium tabular-nums ${ch.slotsRemaining > 0 ? "text-white/60" : "text-white/20"}`}>
                        {ch.slotsRemaining}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-white/20 mb-0.5">Pending Queue</p>
                      <p className={`text-sm font-medium tabular-nums ${ch.pendingUnscheduled > 0 ? "text-white/60" : "text-white/20"}`}>
                        {ch.pendingUnscheduled}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-white/20 mb-0.5">Next Upload</p>
                      <p className="text-sm font-medium font-mono text-white/40">{formatTime(ch.nextScheduledAt)}</p>
                    </div>
                  </div>

                  {/* Warning states */}
                  {ch.channelStatus === "active" && !ch.oauthConnected && (
                    <p className="mt-3 text-[10px] text-orange-400/60">
                      OAuth not connected —{" "}
                      <Link href="/admin/youtube/engine" className="underline hover:text-orange-400/90">connect channel →</Link>
                    </p>
                  )}
                  {ch.pendingUnscheduled === 0 && ch.slotsRemaining > 0 && (
                    <p className="mt-3 text-[10px] text-white/20">
                      No pending jobs — add beats to the queue to fill remaining slots.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Auto-Schedule All */}
      {activeChannels.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">Bulk Schedule</p>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 space-y-3">
            <p className="text-[11px] text-white/40 leading-relaxed">
              Distributes all pending, unscheduled jobs across {activeChannels.length} active channel{activeChannels.length !== 1 ? "s" : ""} — spacing uploads evenly through the rest of today based on each channel&apos;s cadence.
            </p>
            <ScheduleAllPanel />
          </div>
        </section>
      )}

      {/* Cron Setup */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-4">Automatic Cron Setup</p>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 space-y-5">
          <p className="text-[11px] text-white/40 leading-relaxed">
            Point any cron service at the endpoint below. It auto-schedules all channels and immediately runs the upload processor.
            Set <code className="font-mono text-white/60 bg-white/[0.06] px-1 py-0.5 rounded text-[10px]">CRON_SECRET</code> in your environment to authenticate requests.
          </p>

          <div className="space-y-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/25 mb-1.5">Endpoint</p>
              <code className="block text-[11px] font-mono text-sky-400/70 bg-sky-500/5 border border-sky-500/15 rounded-lg px-3 py-2 break-all">
                GET {cronUrl}
              </code>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-white/25 mb-1.5">Authorization header</p>
              <code className="block text-[11px] font-mono text-white/40 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
                Authorization: Bearer $&#123;CRON_SECRET&#125;
              </code>
            </div>
          </div>

          <div className="border-t border-white/[0.05] pt-5 space-y-3">
            <p className="text-[9px] uppercase tracking-[0.15em] text-white/25">Suggested schedules</p>

            <div className="space-y-2">
              {[
                { label: "3×/day (8-hour intervals)", cron: "0 0,8,16 * * *" },
                { label: "2×/day (morning + evening)", cron: "0 9,18 * * *" },
                { label: "4×/day (6-hour intervals)", cron: "0 0,6,12,18 * * *" },
              ].map(({ label, cron }) => (
                <div key={cron} className="flex items-center justify-between gap-4 py-1">
                  <span className="text-[11px] text-white/35">{label}</span>
                  <code className="text-[10px] font-mono text-white/50 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded flex-none">{cron}</code>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.04] pt-3 space-y-1.5 text-[10px] text-white/25 leading-relaxed">
              <p><span className="font-semibold text-white/40">Vercel Cron</span> — add to <code className="font-mono text-white/40">vercel.json</code>:{" "}
                <code className="font-mono text-white/35">{'"crons": [&#123;"path": "/api/youtube/cron", "schedule": "0 0,8,16 * * *"&#125;]'}</code>
              </p>
              <p><span className="font-semibold text-white/40">GitHub Actions</span> — use <code className="font-mono text-white/40">schedule: cron: …</code> and <code className="font-mono text-white/40">curl -H &quot;Authorization: Bearer $CRON_SECRET&quot; {cronUrl}</code></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
