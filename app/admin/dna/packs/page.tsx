import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getAllPacks } from "@/lib/db/dnaPacks"
import { getAllDNARecords } from "@/lib/db/dna"
import { updatePackStatus, deletePack } from "@/app/actions/dnaPacks"

export const metadata = { title: "DNA Packs — SUMG Admin" }

const STATUS_STYLE: Record<string, string> = {
  draft:             "text-white/40 border-white/10 bg-white/[0.03]",
  approved:          "text-sky-400 border-sky-500/25 bg-sky-400/5",
  assigned_to_queue: "text-emerald-400 border-emerald-500/25 bg-emerald-400/5",
}

const STATUS_LABEL: Record<string, string> = {
  draft:             "Draft",
  approved:          "Approved",
  assigned_to_queue: "In Queue",
}

const PLATFORM_LABEL: Record<string, string> = {
  youtube_beat: "YT Beat",
  suno:         "Suno",
  cover_art:    "Cover Art",
  music_video:  "Music Video",
  short_reel:   "Short/Reel",
}

export default async function DNAPacksPage() {
  await requireAdmin()

  const [packs, dnaRecords] = await Promise.all([
    getAllPacks(),
    getAllDNARecords(),
  ])

  const dnaById = Object.fromEntries(dnaRecords.map((r) => [r.id, r]))

  const drafts   = packs.filter((p) => p.status === "draft")
  const approved = packs.filter((p) => p.status === "approved")
  const queued   = packs.filter((p) => p.status === "assigned_to_queue")

  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/admin/dna"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← DNA System
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">DNA Packs</h1>
            <p className="text-xs text-white/35 mt-1">{packs.length} pack{packs.length !== 1 ? "s" : ""} saved</p>
          </div>
          <Link
            href="/admin/dna/builder"
            className="shrink-0 rounded-full bg-white px-4 py-2 text-[11px] font-medium text-black hover:bg-white/90 transition"
          >
            + New Pack
          </Link>
        </div>
      </div>

      {/* Stats */}
      {packs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Draft",    count: drafts.length,   style: "text-white/60" },
            { label: "Approved", count: approved.length, style: "text-sky-400" },
            { label: "In Queue", count: queued.length,   style: "text-emerald-400" },
          ].map(({ label, count, style }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-4">
              <p className={`text-2xl font-semibold tabular-nums ${style}`}>{count}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wide mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {packs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.07] p-16 text-center">
          <p className="text-sm text-white/25 mb-4">No packs yet.</p>
          <Link
            href="/admin/dna/builder"
            className="text-[11px] border border-white/15 text-white/50 hover:text-white px-4 py-2 rounded-xl transition-colors"
          >
            Open Builder →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          {packs.map((pack, i) => {
            const producerRecord = pack.producer_dna_id ? dnaById[pack.producer_dna_id] : null
            const artistRecord   = pack.artist_dna_id   ? dnaById[pack.artist_dna_id]   : null
            const canCreateJob   = pack.status === "approved" && !pack.yt_job_id

            return (
              <div
                key={pack.id}
                className={`px-5 py-4 ${i < packs.length - 1 ? "border-b border-white/[0.05]" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status + platform badges + title */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide flex-none ${
                          STATUS_STYLE[pack.status] ?? "text-white/30 border-white/10"
                        }`}
                      >
                        {STATUS_LABEL[pack.status] ?? pack.status}
                      </span>
                      {pack.platform && (
                        <span className="text-[9px] border border-white/[0.07] px-1.5 py-0.5 rounded text-white/25 uppercase tracking-wide flex-none">
                          {PLATFORM_LABEL[pack.platform] ?? pack.platform}
                        </span>
                      )}
                      <p className="text-sm font-medium text-white/80 truncate">
                        {pack.title}
                      </p>
                    </div>

                    {/* Artist × Producer */}
                    {(artistRecord || producerRecord) && (
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {artistRecord?.name}
                        {artistRecord && producerRecord && " × "}
                        {producerRecord?.name}
                      </p>
                    )}

                    {/* First line of song prompt */}
                    {pack.song_prompt && (
                      <p className="text-[11px] text-white/25 line-clamp-1 mt-0.5">
                        {pack.song_prompt.split("\n")[0]}
                      </p>
                    )}

                    {/* Date + job link */}
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] text-white/20 font-mono">
                        {new Date(pack.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                      {pack.yt_job_id && (
                        <Link
                          href="/admin/youtube/queue"
                          className="text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors"
                        >
                          View in Queue →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Draft → approve */}
                    {pack.status === "draft" && (
                      <form
                        action={async () => {
                          "use server"
                          await updatePackStatus(pack.id, "approved")
                        }}
                      >
                        <button
                          type="submit"
                          className="text-[10px] border border-sky-500/20 text-sky-400/60 px-2.5 py-1.5 rounded-lg hover:border-sky-500/40 hover:text-sky-400 transition-colors"
                        >
                          Approve
                        </button>
                      </form>
                    )}

                    {/* Approved + no job → Create YouTube Job */}
                    {canCreateJob && (
                      <Link
                        href={`/admin/dna/packs/${pack.id}/create-job`}
                        className="text-[10px] border border-red-500/30 text-red-400/70 px-2.5 py-1.5 rounded-lg hover:border-red-500/50 hover:text-red-400 transition-colors whitespace-nowrap"
                      >
                        Create YT Job →
                      </Link>
                    )}

                    {/* Approved + already has job → just show queue link */}
                    {pack.status === "approved" && pack.yt_job_id && (
                      <Link
                        href="/admin/youtube/queue"
                        className="text-[10px] border border-emerald-500/20 text-emerald-400/50 px-2.5 py-1.5 rounded-lg hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
                      >
                        View Job →
                      </Link>
                    )}

                    <form action={deletePack}>
                      <input type="hidden" name="id" value={pack.id} />
                      <button
                        type="submit"
                        className="text-[10px] border border-red-500/10 text-red-400/30 px-2.5 py-1.5 rounded-lg hover:border-red-500/30 hover:text-red-400/70 transition-colors"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                {/* Expandable content preview */}
                {pack.song_prompt && (
                  <details className="mt-3">
                    <summary className="text-[10px] text-white/20 hover:text-white/40 cursor-pointer transition-colors">
                      Show content blocks
                    </summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "Song Prompt",      value: pack.song_prompt },
                        { label: "Suno Metatags",    value: pack.suno_metatags },
                        { label: "Title Ideas",      value: pack.title_ideas },
                        { label: "Thumbnail Prompt", value: pack.thumbnail_prompt },
                      ]
                        .filter((b) => b.value)
                        .map(({ label, value }) => (
                          <div
                            key={label}
                            className="rounded-xl border border-white/[0.05] bg-black/20 p-3"
                          >
                            <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-2">
                              {label}
                            </p>
                            <p className="text-[11px] text-white/45 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                              {value}
                            </p>
                          </div>
                        ))}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
