import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getAllDNARecords } from "@/lib/db/dna"
import type { DNARecord } from "@/lib/db/dna"

export const metadata = { title: "DNA System — SUMG Admin" }

const PRIORITY_COLOR: Record<string, string> = {
  "flagship":          "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "flagship producer": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "high":              "text-sky-400 bg-sky-400/10 border-sky-400/20",
}

function DNACard({ record }: { record: DNARecord }) {
  return (
    <Link
      href={`/admin/dna/${record.entity_type}/${record.slug}`}
      className="group block rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 hover:border-white/15 hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{record.name}</p>
          <p className="text-[10px] text-white/35 mt-0.5">{record.archetype ?? "—"}</p>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide ${PRIORITY_COLOR[record.priority_level] ?? "text-white/30 bg-white/5 border-white/10"}`}>
          {record.priority_level}
        </span>
      </div>
      {record.brand_positioning && (
        <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{record.brand_positioning}</p>
      )}
      {record.genre_core.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {record.genre_core.slice(0, 3).map((g) => (
            <span key={g} className="text-[9px] px-1.5 py-0.5 rounded border border-white/[0.07] text-white/30 font-mono">{g}</span>
          ))}
        </div>
      )}
    </Link>
  )
}

export default async function DNALandingPage() {
  await requireAdmin()
  const records = await getAllDNARecords()
  const artists = records.filter(r => r.entity_type === "artist")
  const producers = records.filter(r => r.entity_type === "producer")

  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2">System</p>
        <h1 className="text-lg font-semibold tracking-tight">DNA System</h1>
        <p className="text-xs text-white/35 mt-1">
          Editable identity, sonic, visual, and rollout baselines for every artist and producer on the roster.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        {[
          { label: "Artists", value: artists.length, href: "/admin/dna/artists" },
          { label: "Producers", value: producers.length, href: "/admin/dna/producers" },
        ].map(({ label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 hover:border-white/15 hover:bg-white/[0.03] transition-colors"
          >
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-[10px] text-white/35 uppercase tracking-wide mt-1">{label} →</p>
          </Link>
        ))}
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">Artists</h2>
          <Link href="/admin/dna/artists" className="text-[10px] text-white/30 hover:text-white/60 transition-colors">View all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {artists.map(r => <DNACard key={r.id} record={r} />)}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">Producers</h2>
          <Link href="/admin/dna/producers" className="text-[10px] text-white/30 hover:text-white/60 transition-colors">View all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {producers.map(r => <DNACard key={r.id} record={r} />)}
        </div>
      </section>
    </div>
  )
}
