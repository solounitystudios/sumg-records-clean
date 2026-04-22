"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useShopifyStore } from "@/lib/shopify/store";

export default function AdminCollectionsPage() {
  const { collections, syncStatus } = useShopifyStore();

  const [brandFilter, setBrandFilter] = useState("all");

  const brands = useMemo(
    () => Array.from(new Set(collections.map((c) => c.brandSlug))).sort(),
    [collections]
  );

  const filtered = useMemo(() => {
    if (brandFilter === "all") return collections;
    return collections.filter((c) => c.brandSlug === brandFilter);
  }, [collections, brandFilter]);

  const selectCls =
    "bg-transparent border border-white/10 text-[10px] tracking-[0.1em] uppercase text-white/40 px-3 py-2 outline-none hover:border-white/20 transition-colors";

  return (
    <AdminShell title="Collections">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black text-white/80 mb-1">Collections</h2>
          <p className="text-[11px] text-white/30">
            Shopify collections grouped by brand. Manage collection contents in the Shopify admin.
          </p>
        </div>

        {/* Sync status banner */}
        {!syncStatus.connected && (
          <div className="border border-yellow-700/60 bg-yellow-950/40 px-4 py-3 text-[11px] text-yellow-400/90 flex items-start gap-2">
            <span className="flex-shrink-0 mt-px">⚠</span>
            <span>
              <strong>Mock data — not real.</strong> Shopify is not configured so all numbers below are from static sample data.{" "}
              Set <span className="font-mono text-yellow-300/70">NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN</span> to enable live sync.
            </span>
          </div>
        )}

        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="border border-white/5 p-5">
            <p className="text-3xl font-black mb-1 text-white">{collections.length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Total Collections</p>
          </div>
          <div className="border border-white/5 p-5">
            <p className="text-3xl font-black mb-1 text-green-400/70">{collections.filter((c) => c.published).length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Published</p>
          </div>
          <div className="border border-white/5 p-5">
            <p className="text-3xl font-black mb-1 text-white/40">{collections.filter((c) => !c.published).length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Unpublished</p>
          </div>
        </div>

        {/* Filter */}
        <div>
          <select className={selectCls} value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="all">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="border border-white/5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                {["Title", "Brand", "Products", "Published", "Handle", "Last Synced"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-white/20 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-[11px] text-white/20 italic text-center">
                    No collections match the current filter.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[12px] text-white/70">{c.title}</td>
                  <td className="px-4 py-3 text-[11px] text-white/35 font-mono">{c.brandSlug}</td>
                  <td className="px-4 py-3 text-[11px] text-white/50 font-mono">{c.productsCount}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] tracking-[0.15em] uppercase border px-1.5 py-0.5 ${c.published ? "text-green-400/70 border-green-800/40" : "text-white/25 border-white/10"}`}>
                      {c.published ? "Published" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-white/25 font-mono">{c.handle}</td>
                  <td className="px-4 py-3 text-[10px] text-white/20">
                    {c.lastSynced ? c.lastSynced.slice(0, 10) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
