import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getAllInboxItems, getArchivedInboxItems, getInboxCounts } from "@/lib/db/audioInbox"
import { getProducers } from "@/lib/db/producers"
import { InboxClient } from "./InboxClient"
import type { InboxStatus } from "@/lib/db/audioInbox"

export const metadata = { title: "Audio Inbox — SUMG Admin" }

const VALID_STATUSES: Set<string> = new Set([
  "new_asset", "analyzing", "needs_review", "needs_metadata",
  "needs_thumbnail", "needs_render", "ready_to_schedule",
  "scheduled", "uploaded", "failed", "archived",
])

export default async function AudioInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requireAdmin()

  const { status } = await searchParams
  const activeFilter = status && VALID_STATUSES.has(status) ? status : "all"

  const [items, producers, counts] = await Promise.all([
    activeFilter === "archived"
      ? getArchivedInboxItems()
      : getAllInboxItems(activeFilter === "all" ? undefined : activeFilter as InboxStatus),
    getProducers(),
    getInboxCounts(),
  ])

  const needsAttention =
    (counts.needs_review ?? 0) +
    (counts.needs_render ?? 0) +
    (counts.ready_to_schedule ?? 0)

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl">

      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/youtube"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← YouTube Automation
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Audio Inbox</h1>
            <p className="text-xs text-white/35 mt-1">
              {counts.all ?? 0} items · {needsAttention} need attention
            </p>
          </div>
          <a
            href="/admin/assets"
            className="text-[11px] border border-white/20 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:border-white/35 transition-colors whitespace-nowrap"
          >
            Upload Audio →
          </a>
        </div>
      </div>

      {/* Status summary cards — clicking sets the active filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "New",       count: counts.new_asset ?? 0,         color: "text-white/50",    filter: "new_asset" },
          { label: "Review",    count: counts.needs_review ?? 0,       color: "text-orange-400",  filter: "needs_review" },
          { label: "Render",    count: (counts.needs_render ?? 0) + (counts.ready_to_schedule ?? 0), color: "text-amber-400", filter: "needs_render" },
          { label: "Scheduled", count: counts.scheduled ?? 0,          color: "text-violet-400",  filter: "scheduled" },
          { label: "Uploaded",  count: counts.uploaded ?? 0,           color: "text-emerald-400", filter: "uploaded" },
        ].map(({ label, count, color, filter }) => {
          const isActive = activeFilter === filter
          return (
            <Link
              key={label}
              href={`/admin/youtube/inbox?status=${filter}`}
              className={`rounded-xl border px-4 py-3 transition-colors hover:border-white/20 ${
                isActive
                  ? "border-white/25 bg-white/[0.05]"
                  : "border-white/[0.07] bg-[#0d1016] hover:bg-white/[0.03]"
              }`}
            >
              <p className={`text-2xl font-semibold tabular-nums ${color}`}>{count}</p>
              <p className="text-[9px] text-white/25 uppercase tracking-wide mt-0.5">{label}</p>
            </Link>
          )
        })}
      </div>

      {/* Pipeline reference */}
      <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 overflow-x-auto">
        <div className="flex items-center gap-2 text-[9px] text-white/30 whitespace-nowrap min-w-max">
          {[
            "upload",
            "→ classify",
            "→ review",
            "→ metadata",
            "→ thumbnail",
            "→ pack + job",
            "→ render",
            "→ schedule",
            "→ upload",
            "→ analytics",
          ].map((step, i) => (
            <span
              key={i}
              className={`${
                step.startsWith("→") ? "text-white/15" : "text-white/40 font-medium"
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Inbox table */}
      <InboxClient
        items={items}
        producers={producers
          .filter((p) => !p.status || p.status === "active")
          .map((p) => ({ slug: p.slug, name: p.name }))}
        counts={counts}
        activeFilter={activeFilter}
      />
    </div>
  )
}
