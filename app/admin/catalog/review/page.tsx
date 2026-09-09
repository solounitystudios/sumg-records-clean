import { requireAdmin } from "@/lib/auth"
import Link from "next/link"

export default async function CatalogReviewPage() {
  await requireAdmin()

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/catalog" className="text-xs text-white/35 hover:text-white/60">← Catalog</Link>
      </div>
      <h1 className="text-lg font-semibold tracking-tight mb-2">Catalog Review</h1>
      <p className="text-xs text-white/40 mb-6 max-w-xl">
        Foundation only — no rights-review queue is live yet. Rights state
        (unknown / under_review / cleared / restricted / denied / expired) and hard policy
        flags are designed in <code className="text-white/60">lib/catalog/rights.ts</code> and
        <code className="mx-1 text-white/60">lib/catalog/policy.ts</code>. AI can describe
        evidence but can never set a rights record to cleared — see
        <code className="mx-1 text-white/60">docs/SUMG_CATALOG_COMMAND_CENTER_ARCHITECTURE.md</code>.
      </p>
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5">
        <p className="text-xs text-white/50 mb-3">Existing rights-adjacent surfaces today:</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/rights" className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 hover:border-white/30 hover:text-white">Rights →</Link>
          <Link href="/admin/contracts" className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 hover:border-white/30 hover:text-white">Contracts →</Link>
        </div>
      </div>
    </div>
  )
}
