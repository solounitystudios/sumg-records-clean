import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getProducerBySlug } from "@/lib/db/producers"
import { getProducerAssets } from "@/lib/db/producerAssets"
import { getAssets, formatBytes } from "@/lib/db/assets"
import { assignAsset, updateAssetStatus, unassignAsset } from "@/app/actions/producers"
import type { ProducerAssetStatus } from "@/lib/db/producerAssets"

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const producer = await getProducerBySlug(slug)
  if (!producer) return { title: "Not Found — SUMG Admin" }
  return { title: `${producer.name} — Asset Bin` }
}

const STATUS_STYLES: Record<ProducerAssetStatus, string> = {
  raw:       "text-white/30 border-white/10",
  queued:    "text-yellow-400/70 border-yellow-500/25",
  rendered:  "text-blue-400/70 border-blue-500/25",
  scheduled: "text-sky-400/70 border-sky-500/25",
  published: "text-green-400/70 border-green-500/25",
  failed:    "text-red-400/70 border-red-500/25",
}

const STATUSES: ProducerAssetStatus[] = ["raw", "queued", "rendered", "scheduled", "published", "failed"]

export default async function ProducerAssetsPage({ params }: Props) {
  await requireAdmin()
  const { slug } = await params
  const [producer, assigned, allAudio] = await Promise.all([
    getProducerBySlug(slug),
    getProducerAssets(slug),
    getAssets("audio"),
  ])
  if (!producer) notFound()

  const assignedIds = new Set(assigned.map((a) => a.assetId))
  const availableAudio = allAudio.filter((a) => !assignedIds.has(a.id))

  return (
    <div className="px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/admin/producers/${slug}/edit`}
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← {producer.name}
        </Link>
        <h1 className="text-lg font-semibold">Asset Bin</h1>
        <p className="text-xs text-white/35 mt-1">
          {assigned.length} assigned · {allAudio.length} audio files in library
        </p>
      </div>

      {/* Assign new asset */}
      {availableAudio.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-4">Assign Audio Asset</p>
          <form action={assignAsset} className="flex flex-col sm:flex-row gap-3">
            <input type="hidden" name="producer_slug" value={slug} />
            <select name="asset_id" required
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/60 focus:outline-none focus:border-white/30 transition">
              <option value="">Select audio file…</option>
              {availableAudio.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.filename} ({formatBytes(a.size_bytes)})
                </option>
              ))}
            </select>
            <input name="notes" type="text" placeholder="Notes (optional)"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60 placeholder:text-white/20 focus:outline-none focus:border-white/25 transition w-48" />
            <button type="submit"
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/60 hover:border-white/40 hover:text-white transition flex-none">
              Assign
            </button>
          </form>
        </div>
      )}

      {/* Assigned assets */}
      {assigned.length === 0 ? (
        <p className="text-sm text-white/25 py-12 text-center">No assets assigned yet.</p>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05] grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">File</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 w-24">Status</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 w-20">Size</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 w-20">Actions</p>
          </div>

          {assigned.map((item, i) => (
            <div
              key={item.id}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 ${i < assigned.length - 1 ? "border-b border-white/[0.04]" : ""}`}
            >
              {/* Filename */}
              <div className="min-w-0">
                <p className="text-sm text-white/70 truncate">{item.assetFilename ?? item.assetId}</p>
                {item.notes && (
                  <p className="text-[10px] text-white/25 mt-0.5 truncate">{item.notes}</p>
                )}
              </div>

              {/* Status selector */}
              <form action={updateAssetStatus} className="w-24">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="producer_slug" value={slug} />
                <select
                  name="status"
                  defaultValue={item.status}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className={`w-full border rounded-lg px-2 py-1 text-[10px] uppercase tracking-[0.1em] bg-transparent focus:outline-none transition-colors cursor-pointer ${STATUS_STYLES[item.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-neutral-900 text-white normal-case">{s}</option>
                  ))}
                </select>
              </form>

              {/* Size */}
              <span className="text-[10px] text-white/25 font-mono w-20 text-right">
                {formatBytes(item.assetSizeBytes ?? null)}
              </span>

              {/* Unassign */}
              <div className="w-20 flex justify-end">
                <form action={unassignAsset}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="producer_slug" value={slug} />
                  <button type="submit"
                    className="text-[10px] text-white/20 hover:text-red-400/60 transition-colors">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status legend */}
      <div className="mt-6 flex flex-wrap gap-3">
        {STATUSES.map((s) => (
          <span key={s} className={`text-[9px] uppercase tracking-[0.1em] border px-2 py-0.5 rounded ${STATUS_STYLES[s]}`}>{s}</span>
        ))}
      </div>
    </div>
  )
}
