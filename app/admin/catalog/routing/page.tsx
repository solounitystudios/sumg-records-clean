import { requireAdmin } from "@/lib/auth"
import Link from "next/link"

export default async function CatalogRoutingPage() {
  await requireAdmin()

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/catalog" className="text-xs text-white/35 hover:text-white/60">← Catalog</Link>
      </div>
      <h1 className="text-lg font-semibold tracking-tight mb-2">Routing Desk</h1>
      <p className="text-xs text-white/40 mb-6 max-w-xl">
        Foundation only — no routing recipes or destination assignments are live yet.
        Routing recipes always produce a proposal; only an explicit human approval can move
        a decision out of &ldquo;proposed&rdquo;, and hard policy flags always override a
        recommendation. See <code className="text-white/60">lib/catalog/routing.ts</code>,
        <code className="mx-1 text-white/60">lib/catalog/destinations.ts</code>, and
        <code className="mx-1 text-white/60">docs/SUMG_CATALOG_IMPLEMENTATION_PLAN.md</code>.
      </p>
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5">
        <p className="text-xs text-white/50">
          The founder (or an authorized human) decides — AI and routing recipes only propose.
        </p>
      </div>
    </div>
  )
}
