import { requireAdmin } from "@/lib/auth"
import Link from "next/link"

export default async function CatalogIntakePage() {
  await requireAdmin()

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/catalog" className="text-xs text-white/35 hover:text-white/60">← Catalog</Link>
      </div>
      <h1 className="text-lg font-semibold tracking-tight mb-2">Catalog Intake</h1>
      <p className="text-xs text-white/40 mb-6 max-w-xl">
        Foundation only — no data model is live for this route yet. The intake lifecycle
        (DISCOVERED → EXPORTING → SECURED → VERIFIED → ANALYZING → NEEDS_ROUTING → ROUTED →
        RIGHTS_REVIEW → APPROVED → DISTRIBUTED → ACTIVE → ARCHIVED) is designed in
        <code className="mx-1 text-white/60">lib/catalog/intake.ts</code>
        and generalizes the existing Audio Inbox pipeline rather than replacing it — see
        <code className="mx-1 text-white/60">docs/SUMG_CATALOG_REUSE_AUDIT.md</code>.
      </p>
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5">
        <p className="text-xs text-white/50 mb-3">Existing intake for uploaded audio already lives here:</p>
        <Link
          href="/admin/youtube/inbox"
          className="inline-block rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 hover:border-white/30 hover:text-white"
        >
          Audio Inbox →
        </Link>
      </div>
    </div>
  )
}
