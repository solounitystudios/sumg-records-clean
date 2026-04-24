import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getDNAByType } from "@/lib/db/dna"

export const metadata = { title: "Artist DNA — SUMG Admin" }

const PRIORITY_COLOR: Record<string, string> = {
  "flagship":          "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "flagship producer": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "high":              "text-sky-400 bg-sky-400/10 border-sky-400/20",
}

export default async function ArtistDNAListPage() {
  await requireAdmin()
  const records = await getDNAByType("artist")

  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <Link href="/admin/dna" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← DNA System
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">Artist DNA</h1>
        <p className="text-xs text-white/35 mt-1">{records.length} record{records.length !== 1 ? "s" : ""}</p>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-white/30 py-12 text-center">No artist DNA records yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <Link
              key={r.id}
              href={`/admin/dna/artist/${r.slug}`}
              className="group block rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 hover:border-white/15 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{r.name}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{r.archetype ?? "—"}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide flex-none ${PRIORITY_COLOR[r.priority_level] ?? "text-white/30 bg-white/5 border-white/10"}`}>
                  {r.priority_level}
                </span>
              </div>
              {r.brand_positioning && (
                <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{r.brand_positioning}</p>
              )}
              {r.genre_core.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {r.genre_core.slice(0, 4).map((g) => (
                    <span key={g} className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.07] text-white/30 font-mono">{g}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
