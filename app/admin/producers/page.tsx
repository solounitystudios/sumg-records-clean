import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getProducers } from "@/lib/db/producers"
import { getAssets } from "@/lib/db/assets"
import { PlayButton } from "@/components/admin/player/PlayButton"
import type { AudioTrack } from "@/lib/player/context"

export const metadata = { title: "Producer Network — SUMG Admin" }

const STATUS_DOT: Record<string, string> = {
  active:   "bg-green-400/60",
  inactive: "bg-yellow-400/50",
  archived: "bg-white/15",
}

export default async function ProducersAdminPage() {
  await requireAdmin()
  const [producers, audioAssets] = await Promise.all([getProducers(), getAssets("audio")])
  const totalCredits = producers.reduce((s, p) => s + p.credits, 0)
  const ytLinked = producers.filter((p) => p.ytChannelId).length

  // Group audio tracks by producer slug for play queues
  const audioByProducer = audioAssets.reduce<Record<string, AudioTrack[]>>((acc, a) => {
    if (!a.producer_slug) return acc
    if (!acc[a.producer_slug]) acc[a.producer_slug] = []
    acc[a.producer_slug].push({ id: a.id, url: a.url, title: a.filename, producer: a.producer_slug, source: "producer-bin" })
    return acc
  }, {})

  return (
    <main className="px-6 py-10 md:px-10 max-w-5xl">
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
          <h1 className="text-3xl font-semibold">Producer Network</h1>
          <p className="mt-2 text-sm text-white/50">Manage the SUMG producer roster.</p>
        </div>
        <Link
          href="/admin/producers/new"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 hover:border-white/40 hover:text-white transition flex-none"
        >
          + Add Producer
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-10">
        {[
          { label: "Producers",    value: producers.length },
          { label: "Total Credits", value: totalCredits },
          { label: "Specialties",  value: [...new Set(producers.flatMap((p) => p.specialties))].length },
          { label: "YT Linked",    value: ytLinked },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {producers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-12 text-center">
          <p className="text-sm text-white/35 mb-4">No producers yet.</p>
          <Link href="/admin/producers/new" className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition">
            Add the first producer →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          {producers.map((producer, i) => (
            <div
              key={producer.id}
              className={`flex items-center gap-5 px-6 py-4 ${i < producers.length - 1 ? "border-b border-white/[0.05]" : ""}`}
            >
              {/* Status dot */}
              <span className={`w-1.5 h-1.5 rounded-full flex-none ${STATUS_DOT[producer.status ?? "active"] ?? "bg-white/15"}`} />

              {/* Avatar placeholder or image */}
              {producer.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={producer.imageUrl} alt={producer.name}
                  className="w-9 h-9 rounded-xl object-cover flex-none opacity-80" />
              ) : (
                <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-xs font-semibold text-white/40 flex-none">
                  {String(i + 1).padStart(2, "0")}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/85 truncate">{producer.name}</p>
                <p className="text-[10px] text-white/30 truncate mt-0.5">
                  {producer.credits} credits
                  {producer.specialties.length > 0 && ` · ${producer.specialties.slice(0, 2).join(", ")}`}
                  {producer.ytHandle && ` · ${producer.ytHandle}`}
                </p>
              </div>

              {/* Play button — loads all audio assets for this producer */}
              {audioByProducer[producer.slug]?.length > 0 && (
                <PlayButton
                  track={audioByProducer[producer.slug][0]}
                  queue={audioByProducer[producer.slug]}
                />
              )}

              {/* DNA link indicator */}
              {producer.dnaSlug && (
                <Link
                  href={`/admin/dna/producer/${producer.dnaSlug}`}
                  className="text-[9px] uppercase tracking-[0.1em] border border-sky-500/25 text-sky-400/60 px-2 py-0.5 hover:border-sky-500/50 hover:text-sky-400 transition-colors flex-none"
                >
                  DNA
                </Link>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-none">
                <Link
                  href={`/admin/producers/${producer.slug}/assets`}
                  className="text-[10px] uppercase tracking-[0.12em] text-white/25 hover:text-white/60 transition-colors"
                >
                  Assets
                </Link>
                <Link
                  href={`/admin/producers/${producer.slug}/edit`}
                  className="text-[10px] uppercase tracking-[0.12em] border border-white/10 text-white/35 px-3 py-1.5 hover:border-white/25 hover:text-white transition-colors"
                >
                  Edit
                </Link>
                <Link
                  href={`/producers/${producer.slug}`}
                  className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
                >
                  ↗
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
