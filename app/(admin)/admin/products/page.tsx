"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { useShopifyStore } from "@/lib/shopify/store";

function InventoryBadge({ count }: { count: number }) {
  const cls =
    count === 0
      ? "text-red-400/80"
      : count < 5
      ? "text-yellow-400/80"
      : count <= 10
      ? "text-yellow-300/70"
      : "text-green-400/70";
  return <span className={`font-mono text-[11px] ${cls}`}>{count}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "text-green-400/70 border-green-800/40"
      : status === "draft"
      ? "text-white/30 border-white/10"
      : "text-red-400/50 border-red-900/30";
  return (
    <span className={`text-[9px] tracking-[0.15em] uppercase border px-1.5 py-0.5 ${cls}`}>
      {status}
    </span>
  );
}

export default function AdminProductsPage() {
  const { products, syncStatus } = useShopifyStore();

  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brandSlug))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (brandFilter !== "all" && p.brandSlug !== brandFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [products, brandFilter, statusFilter]);

  const activeCount = products.filter((p) => p.status === "active").length;
  const draftArchivedCount = products.filter((p) => p.status !== "active").length;
  const lowInventoryCount = products.filter((p) => p.inventory < 5 && p.status === "active").length;

  const selectCls =
    "bg-transparent border border-white/10 text-[10px] tracking-[0.1em] uppercase text-white/40 px-3 py-2 outline-none hover:border-white/20 transition-colors";

  return (
    <AdminShell title="Products">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black text-white/80 mb-1">Products</h2>
          <p className="text-[11px] text-white/30">
            Commerce catalog managed through Shopify. Use manual fallback when Shopify is not configured.
          </p>
        </div>

        {/* Sync status banner */}
        {!syncStatus.connected && (
          <div className="border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10px] tracking-[0.1em] text-white/30">
            Shopify not configured — showing manual fallback data.{" "}
            Set <span className="font-mono text-white/40">NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN</span> to enable live sync.
          </div>
        )}

        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Products",  value: products.length,     accent: "" },
            { label: "Active",          value: activeCount,         accent: "text-green-400/80" },
            { label: "Draft / Archived", value: draftArchivedCount, accent: "text-white/40" },
            { label: "Low Inventory",   value: lowInventoryCount,   accent: lowInventoryCount > 0 ? "text-yellow-400/80" : "text-white/40" },
          ].map((tile) => (
            <div key={tile.label} className="border border-white/5 p-5">
              <p className={`text-3xl font-black mb-1 ${tile.accent || "text-white"}`}>{tile.value}</p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">{tile.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <select className={selectCls} value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="all">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select className={selectCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Table */}
        <div className="border border-white/5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                {["Title", "Brand", "Type", "Status", "Price", "Inventory", "Collection", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[9px] tracking-[0.25em] uppercase text-white/20 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-[11px] text-white/20 italic text-center">
                    No products match the current filter.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[12px] text-white/70">{p.title}</td>
                  <td className="px-4 py-3 text-[11px] text-white/35 font-mono">{p.brandSlug}</td>
                  <td className="px-4 py-3 text-[11px] text-white/30">{p.productType}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-white/50 font-mono">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3"><InventoryBadge count={p.inventory} /></td>
                  <td className="px-4 py-3 text-[10px] text-white/25">{p.collectionHandle ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-[10px] tracking-[0.1em] uppercase text-white/20 hover:text-white/60 transition-colors"
                    >
                      Edit →
                    </Link>
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
