import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getDNAByType } from "@/lib/db/dna"
import { getAllVariations } from "@/lib/db/dnaPacks"
import { DNAPackBuilder } from "@/components/admin/DNAPackBuilder"

export const metadata = { title: "DNA Pack Builder — SUMG Admin" }

export default async function DNABuilderPage() {
  await requireAdmin()

  const [artists, producers, variations] = await Promise.all([
    getDNAByType("artist"),
    getDNAByType("producer"),
    getAllVariations(),
  ])

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
            <h1 className="text-lg font-semibold tracking-tight">DNA Pack Builder</h1>
            <p className="text-xs text-white/35 mt-1">
              Combine artist DNA + producer DNA + variation → generate copy-ready content blocks.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/dna/packs"
              className="text-[11px] border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 px-3 py-1.5 rounded-xl transition-colors"
            >
              Saved Packs →
            </Link>
            <Link
              href="/admin/dna/variations"
              className="text-[11px] border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 px-3 py-1.5 rounded-xl transition-colors"
            >
              Variations →
            </Link>
          </div>
        </div>
      </div>

      <DNAPackBuilder
        artists={artists}
        producers={producers}
        variations={variations}
      />
    </div>
  )
}
