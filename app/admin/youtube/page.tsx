import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getAllChannels, getJobCounts } from "@/lib/db/youtube"

export const metadata = { title: "YouTube Automation — SUMG Admin" }

function YTIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

export default async function YouTubeOverviewPage() {
  await requireAdmin()
  const [channels, counts] = await Promise.all([getAllChannels(), getJobCounts()])

  const activeChannels  = channels.filter((c) => c.status === "active").length
  const totalCapacity   = channels
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + c.uploadCadence, 0)

  const nav = [
    { label: "Channels",    href: "/admin/youtube/channels",    desc: `${channels.length} configured` },
    { label: "Queue",       href: "/admin/youtube/queue",       desc: `${counts.pending + counts.processing} pending` },
    { label: "Jobs",        href: "/admin/youtube/jobs",        desc: `${counts.uploaded} uploaded · ${counts.failed} failed` },
  ]

  return (
    <div className="px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2">Admin</p>
        <div className="flex items-center gap-3">
          <YTIcon className="w-5 h-5 text-red-500/70" />
          <h1 className="text-xl font-semibold">YouTube Automation</h1>
        </div>
        <p className="text-xs text-white/35 mt-2">
          Upload scheduling and job queue for producer channels. 3 uploads/day target per channel.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Active Channels",   value: activeChannels },
          { label: "Daily Capacity",    value: `${totalCapacity}/day`, mono: true },
          { label: "Queued",            value: counts.pending + counts.processing },
          { label: "Uploaded",          value: counts.uploaded },
        ].map(({ label, value, mono }) => (
          <div key={label} className="border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">{label}</div>
            <div className={`text-2xl font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Job status breakdown */}
      <div className="border border-white/[0.07] bg-[#0d1016] p-6 rounded-2xl mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-5">Job Status</p>
        <div className="flex flex-wrap gap-6">
          {(["needs_asset", "scheduled", "pending", "processing", "uploaded", "failed", "cancelled"] as const).map((s) => (
            <div key={s}>
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/25 mb-1">{s.replace("_", " ")}</p>
              <p className="text-lg font-semibold tabular-nums">{counts[s]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {nav.map(({ label, href, desc }) => (
          <Link key={href} href={href}
            className="border border-white/[0.07] bg-[#0d1016] p-5 hover:border-white/15 hover:bg-white/[0.03] transition-colors rounded-2xl group">
            <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors mb-1">{label}</p>
            <p className="text-[10px] text-white/25">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Architecture note */}
      <div className="border border-white/[0.05] bg-white/[0.02] rounded-2xl px-6 py-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-2">Architecture</p>
        <ul className="space-y-1.5 text-[11px] text-white/40 leading-relaxed">
          <li>• Channels are linked per producer with a configurable upload cadence (default: 3/day).</li>
          <li>• Upload jobs are created from audio assets in a producer&apos;s asset bin.</li>
          <li>• Jobs enter <span className="font-mono text-white/60">pending</span> → <span className="font-mono text-white/60">processing</span> → <span className="font-mono text-white/60">uploaded</span> lifecycle.</li>
          <li>• No credentials are stored here. Actual uploads require OAuth tokens configured server-side.</li>
          <li>• Title/description templates are rendered at job creation time using producer defaults.</li>
        </ul>
      </div>
    </div>
  )
}
