"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useShopifyStore } from "@/lib/shopify/store";

function StockBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="text-[9px] tracking-[0.15em] uppercase border px-1.5 py-0.5 text-red-400/70 border-red-900/40">
        Out of Stock
      </span>
    );
  }
  if (count < 5) {
    return (
      <span className="text-[9px] tracking-[0.15em] uppercase border px-1.5 py-0.5 text-yellow-400/70 border-yellow-800/40">
        Low
      </span>
    );
  }
  return (
    <span className="text-[9px] tracking-[0.15em] uppercase border px-1.5 py-0.5 text-green-400/60 border-green-900/40">
      OK
    </span>
  );
}

export default function AdminInventoryPage() {
  const { inventory, syncStatus } = useShopifyStore();

  const [brandFilter, setBrandFilter] = useState("all");

  const brands = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.brandSlug))).sort(),
    [inventory]
  );

  const filtered = useMemo(() => {
    if (brandFilter === "all") return inventory;
    return inventory.filter((i) => i.brandSlug === brandFilter);
  }, [inventory, brandFilter]);

  const lowCount = inventory.filter((i) => i.available > 0 && i.available < 5).length;
  const outOfStockCount = inventory.filter((i) => i.available === 0).length;

  const selectCls =
    "bg-transparent border border-white/10 text-[10px] tracking-[0.1em] uppercase text-white/40 px-3 py-2 outline-none hover:border-white/20 transition-colors";

  return (
    <AdminShell title="Inventory">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black text-white/80 mb-1">Inventory</h2>
          <p className="text-[11px] text-white/30">
            Inventory levels are synced from Shopify. Update stock in the Shopify admin.
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
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-white/5 p-5">
            <p className="text-3xl font-black mb-1 text-white">{inventory.length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Total SKUs</p>
          </div>
          <div className="border border-white/5 p-5">
            <p className={`text-3xl font-black mb-1 ${lowCount > 0 ? "text-yellow-400/80" : "text-white/40"}`}>{lowCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Low Inventory (&lt; 5)</p>
          </div>
          <div className="border border-white/5 p-5">
            <p className={`text-3xl font-black mb-1 ${outOfStockCount > 0 ? "text-red-400/80" : "text-white/40"}`}>{outOfStockCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Out of Stock</p>
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
                {["Product", "Brand", "SKU", "Available", "Committed", "Incoming", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-white/20 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-[11px] text-white/20 italic text-center">
                    No inventory items match the current filter.
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[12px] text-white/70">
                    {item.productTitle}
                    {item.variantTitle && (
                      <span className="ml-1 text-white/30 text-[10px]">({item.variantTitle})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/35 font-mono">{item.brandSlug}</td>
                  <td className="px-4 py-3 text-[10px] text-white/25 font-mono">{item.sku ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] font-mono">
                    <span className={item.available === 0 ? "text-red-400/80" : item.available < 5 ? "text-yellow-400/80" : "text-green-400/70"}>
                      {item.available}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-white/40 font-mono">{item.committed}</td>
                  <td className="px-4 py-3 text-[11px] text-white/30 font-mono">{item.incoming}</td>
                  <td className="px-4 py-3"><StockBadge count={item.available} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
