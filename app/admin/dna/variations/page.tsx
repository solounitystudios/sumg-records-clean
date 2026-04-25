import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getAllVariations } from "@/lib/db/dnaPacks"

export const metadata = { title: "Producer Variations — SUMG Admin" }

export default async function VariationsPage() {
  await requireAdmin()
  const variations = await getAllVariations()

  // Group by producer slug
  const grouped = variations.reduce<Record<string, typeof variations>>((acc, v) => {
    if (!acc[v.producer_slug]) acc[v.producer_slug] = []
    acc[v.producer_slug].push(v)
    return acc
  }, {})

  const producers = Object.keys(grouped).sort()

  return (
    <div className="px-6 py-8 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/admin/dna"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← DNA System
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Producer Variations</h1>
            <p className="text-xs text-white/35 mt-1">
              {variations.length} variation{variations.length !== 1 ? "s" : ""} across {producers.length} producer{producers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/admin/dna/builder"
            className="shrink-0 rounded-full bg-white px-4 py-2 text-[11px] font-medium text-black hover:bg-white/90 transition"
          >
            Open Builder →
          </Link>
        </div>
      </div>

      <div className="space-y-10">
        {producers.map((slug) => {
          const vars = grouped[slug]
          return (
            <section key={slug}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">
                  {slug}
                </h2>
                <span className="text-[9px] text-white/20">{vars.length} variations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {vars.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-4 space-y-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white/85">{v.variation_name}</p>
                      {v.visual_world && (
                        <p className="text-[11px] text-white/35 mt-1 leading-relaxed line-clamp-2">
                          {v.visual_world}
                        </p>
                      )}
                    </div>

                    {v.colors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.colors.map((c) => (
                          <span
                            key={c}
                            className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.07] text-white/30 font-mono"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {v.best_artist_pairings.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.15em] text-white/20 mb-1">
                          Best with
                        </p>
                        <p className="text-[10px] text-white/40">
                          {v.best_artist_pairings.join(", ")}
                        </p>
                      </div>
                    )}

                    {v.tag_bank.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.tag_bank.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.07] text-white/25 font-mono"
                          >
                            {t}
                          </span>
                        ))}
                        {v.tag_bank.length > 4 && (
                          <span className="text-[9px] text-white/20">
                            +{v.tag_bank.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {v.sound_direction && (
                      <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2 border-t border-white/[0.05] pt-2">
                        {v.sound_direction}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
