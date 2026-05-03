import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getMidjourneyQueue } from "@/lib/youtube/thumbnails/actions"
import { MidjourneyQueueClient } from "./MidjourneyQueueClient"

export const metadata = { title: "Midjourney Queue — SUMG Admin" }

export default async function MidjourneyQueuePage() {
  await requireAdmin()
  const initialItems = await getMidjourneyQueue()

  const pending  = initialItems.filter((i) => i.provider_status === "pending").length
  const complete = initialItems.filter((i) => i.provider_status === "complete").length
  const failed   = initialItems.filter((i) => i.provider_status === "failed").length

  return (
    <div className="px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link
          href="/admin/youtube/thumbnail-studio"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← Thumbnail Studio
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Midjourney Queue</h1>
            <p className="text-xs text-white/35 mt-1">
              {initialItems.length} total · {pending} pending · {complete} complete · {failed} failed
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total",    count: initialItems.length, color: "text-white/60" },
          { label: "Pending",  count: pending,             color: "text-amber-400" },
          { label: "Complete", count: complete,            color: "text-emerald-400" },
          { label: "Failed",   count: failed,              color: "text-red-400" },
        ].map(({ label, count, color }) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-4 py-3">
            <p className={`text-2xl font-semibold tabular-nums ${color}`}>{count}</p>
            <p className="text-[9px] text-white/25 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <MidjourneyQueueClient initialItems={initialItems} />
    </div>
  )
}
