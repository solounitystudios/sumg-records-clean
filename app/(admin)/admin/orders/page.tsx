"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useShopifyStore } from "@/lib/shopify/store";
import type { ShopifyOrderStatus, ShopifyFulfillmentStatus } from "@/lib/shopify/types";

function OrderStatusBadge({ status }: { status: ShopifyOrderStatus }) {
  const cls =
    status === "fulfilled"
      ? "text-green-400/70 border-green-800/40"
      : status === "processing"
      ? "text-blue-400/70 border-blue-800/40"
      : status === "pending"
      ? "text-yellow-400/70 border-yellow-800/40"
      : "text-white/20 border-white/10";
  return (
    <span className={`text-[9px] tracking-[0.15em] uppercase border px-1.5 py-0.5 ${cls}`}>
      {status}
    </span>
  );
}

function FulfillmentBadge({ status }: { status: ShopifyFulfillmentStatus }) {
  const cls =
    status === "fulfilled"
      ? "text-green-400/60"
      : status === "partial"
      ? "text-yellow-400/60"
      : "text-white/25";
  return <span className={`text-[10px] font-mono ${cls}`}>{status}</span>;
}

export default function AdminOrdersPage() {
  const { orders, syncStatus } = useShopifyStore();

  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");

  const brands = useMemo(
    () => Array.from(new Set(orders.map((o) => o.brandSlug).filter(Boolean) as string[])).sort(),
    [orders]
  );

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (brandFilter !== "all" && o.brandSlug !== brandFilter) return false;
      return true;
    });
  }, [orders, statusFilter, brandFilter]);

  const awaitingFulfillment = orders.filter((o) => o.fulfillmentStatus === "unfulfilled").length;
  const pendingPayment = orders.filter((o) => o.financialStatus === "pending").length;
  const totalRevenue = orders
    .filter((o) => o.financialStatus === "paid")
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const selectCls =
    "bg-transparent border border-white/10 text-[10px] tracking-[0.1em] uppercase text-white/40 px-3 py-2 outline-none hover:border-white/20 transition-colors";

  return (
    <AdminShell title="Orders">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black text-white/80 mb-1">Orders</h2>
          <p className="text-[11px] text-white/30">
            Order management is handled in Shopify. SUMG Admin provides a read-only reference view and tracking layer.
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
          <div className="border border-white/5 p-5">
            <p className="text-3xl font-black mb-1 text-white">{orders.length}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Total Orders</p>
          </div>
          <div className="border border-white/5 p-5">
            <p className={`text-3xl font-black mb-1 ${awaitingFulfillment > 0 ? "text-yellow-400/80" : "text-white/40"}`}>
              {awaitingFulfillment}
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Awaiting Fulfillment</p>
          </div>
          <div className="border border-white/5 p-5">
            <p className={`text-3xl font-black mb-1 ${pendingPayment > 0 ? "text-yellow-400/70" : "text-white/40"}`}>
              {pendingPayment}
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Pending Payment</p>
          </div>
          <div className="border border-white/5 p-5">
            <p className="text-3xl font-black mb-1 text-green-400/70">${totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Revenue (Paid)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <select className={selectCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
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
                {["Order #", "Customer", "Brand", "Status", "Financial", "Fulfillment", "Total", "Date"].map((h) => (
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
                    No orders match the current filter.
                  </td>
                </tr>
              )}
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[11px] text-white/60 font-mono">#{o.orderNumber}</td>
                  <td className="px-4 py-3 text-[12px] text-white/55">{o.customerName ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-white/30 font-mono">{o.brandSlug ?? "—"}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-[10px] text-white/35 font-mono">{o.financialStatus}</td>
                  <td className="px-4 py-3"><FulfillmentBadge status={o.fulfillmentStatus} /></td>
                  <td className="px-4 py-3 text-[11px] text-white/50 font-mono">${o.totalPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[10px] text-white/25">{o.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
