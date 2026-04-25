import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getPackById } from "@/lib/db/dnaPacks"
import { getAllDNARecords } from "@/lib/db/dna"
import { getAllChannels } from "@/lib/db/youtube"
import { getAssets } from "@/lib/db/assets"
import { createYtJobFromPack } from "@/app/actions/youtube"

export const metadata = { title: "Create YouTube Job — SUMG Admin" }

interface Props { params: Promise<{ id: string }> }

const input =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass =
  "block text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1.5"

export default async function CreateYtJobFromPackPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const [pack, dnaRecords, channels, audioAssets] = await Promise.all([
    getPackById(id),
    getAllDNARecords(),
    getAllChannels(),
    getAssets("audio"),
  ])

  if (!pack) notFound()
  if (pack.status !== "approved") {
    return (
      <div className="px-6 py-8 max-w-2xl">
        <Link href="/admin/dna/packs" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← Packs
        </Link>
        <p className="text-sm text-white/40">
          Only approved packs can be sent to the YouTube queue. Current status:{" "}
          <span className="font-mono text-white/60">{pack.status}</span>.
        </p>
      </div>
    )
  }

  // Resolve producer slug from pack's producer_dna_id
  const producerRecord = dnaRecords.find((r) => r.id === pack.producer_dna_id)
  const artistRecord   = dnaRecords.find((r) => r.id === pack.artist_dna_id)
  const producerSlug   = producerRecord?.slug ?? ""

  const producerChannels = channels.filter(
    (ch) => ch.producerSlug === producerSlug && ch.status === "active",
  )

  // Pre-fill values from pack
  const defaultTitle       = pack.title_ideas?.split("\n")[0] ?? pack.title
  const defaultDescription = pack.yt_description ?? ""
  const defaultTags        = pack.hashtags
    .map((h) => h.replace(/^#/, ""))
    .join("\n")

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-8">
        <Link href="/admin/dna/packs" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← Packs
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">Create YouTube Job</h1>
        <p className="text-xs text-white/35 mt-1">
          From DNA pack — fields pre-filled from stored content blocks.
        </p>
      </div>

      {/* Pack context */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 mb-6">
        <p className="text-[9px] uppercase tracking-[0.22em] text-white/25 mb-3">Source Pack</p>
        <p className="text-sm font-semibold text-white/85">{pack.title}</p>
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-white/35">
          {artistRecord && <span>Artist: {artistRecord.name}</span>}
          {producerRecord && <span>Producer: {producerRecord.name}</span>}
          {pack.platform && <span>Platform: {pack.platform}</span>}
        </div>
        {pack.thumbnail_prompt && (
          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 mb-1.5">Thumbnail Prompt</p>
            <p className="text-[11px] text-white/40 leading-relaxed">{pack.thumbnail_prompt}</p>
          </div>
        )}
      </div>

      <form action={createYtJobFromPack} className="space-y-5">
        {/* Hidden fields */}
        <input type="hidden" name="pack_id"       value={pack.id} />
        <input type="hidden" name="producer_slug" value={producerSlug} />

        {/* Title */}
        <div>
          <label htmlFor="job-title" className={labelClass}>YouTube Title</label>
          <input
            id="job-title"
            name="title"
            type="text"
            defaultValue={defaultTitle}
            placeholder="Override title…"
            className={input}
          />
          <p className="mt-1 text-[10px] text-white/20">
            Edit to match your final track name. Leave blank to use channel template.
          </p>
        </div>

        {/* Channel */}
        <div>
          <label htmlFor="job-channel" className={labelClass}>
            YouTube Channel
            {producerChannels.length === 0 && (
              <span className="ml-2 text-orange-400/60 normal-case">(no active channels for this producer)</span>
            )}
          </label>
          <select id="job-channel" name="yt_channel_id" className={input}>
            <option value="">Leave unset — assign later</option>
            {producerChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.channelHandle ?? ch.channelId}
              </option>
            ))}
          </select>
          {producerChannels.length === 0 && (
            <p className="mt-1 text-[10px] text-orange-400/50">
              No channel yet for {producerRecord?.name ?? producerSlug}.{" "}
              <Link href="/admin/youtube/channels" className="underline underline-offset-2">
                Add one →
              </Link>
            </p>
          )}
        </div>

        {/* Audio asset */}
        <div>
          <label htmlFor="job-asset" className={labelClass}>Audio Asset</label>
          <select id="job-asset" name="asset_id" className={input}>
            <option value="">None yet — job will be &quot;needs asset&quot;</option>
            {audioAssets.map((a) => (
              <option key={a.id} value={a.id}>{a.filename}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-white/20">
            If no asset is selected the job status will be <span className="font-mono">needs_asset</span>.
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="job-desc" className={labelClass}>YouTube Description</label>
          <textarea
            id="job-desc"
            name="description"
            rows={8}
            defaultValue={defaultDescription}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-y"
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="job-tags" className={labelClass}>Tags (one per line)</label>
          <textarea
            id="job-tags"
            name="tags"
            rows={6}
            defaultValue={defaultTags}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white font-mono placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-y"
          />
        </div>

        {/* Schedule */}
        <div>
          <label htmlFor="job-scheduled" className={labelClass}>Schedule At (optional)</label>
          <input
            id="job-scheduled"
            name="scheduled_at"
            type="datetime-local"
            className={input}
          />
          <p className="mt-1 text-[10px] text-white/20">
            Leave blank to queue immediately. Sets status to <span className="font-mono">scheduled</span> when provided with an asset.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black hover:bg-white/90 transition"
          >
            Create YouTube Job →
          </button>
          <Link
            href="/admin/dna/packs"
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
