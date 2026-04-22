"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AccessShell } from "@/components/access/AccessShell";

/**
 * /access/artist/royalties/[id] — Individual royalty statement detail.
 * Phase 2: Statement breakdown per source will display here once the
 * revenue import pipeline is wired to the artist portal.
 */
export default function RoyaltyStatementPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <AccessShell
      title="Statement"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Royalties", href: "/access/artist/royalties" },
        { label: `Statement ${id}` },
      ]}
    >
      <div className="max-w-xl space-y-8">
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-2">Statement</p>
          <h2 className="text-xl font-black tracking-tight text-white font-mono">{id}</h2>
        </div>

        <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-6">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 mb-2">Coming Soon</p>
          <p className="text-[12px] text-white/40 leading-relaxed">
            Detailed statement breakdowns — line items by DSP, period, and song —
            are part of the Phase 2 revenue pipeline. Your label manager can access
            imported statements in the staff portal.
          </p>
        </div>

        <Link
          href="/access/artist/royalties"
          className="inline-block text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors border border-white/10 px-4 py-2"
        >
          ← Back to Royalties
        </Link>
      </div>
    </AccessShell>
  );
}
