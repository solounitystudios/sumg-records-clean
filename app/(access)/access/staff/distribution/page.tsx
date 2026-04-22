"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useCmsStore } from "@/lib/cms/store";

export default function StaffDistributionPage() {
  const { releases } = useCmsStore();

  const rows = useMemo(
    () =>
      [...releases]
        .filter((r) => r.status !== "archived")
        .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
    [releases]
  );

  const liveCount = rows.filter((r) => r.distributionRecord?.deliveryStatus === "live").length;
  const deliveredCount = rows.filter((r) => r.distributionRecord?.deliveryStatus === "delivered").length;
  const pendingCount = rows.filter((r) => r.distributionRecord?.deliveryStatus === "pending").length;
  const noRecord = rows.filter((r) => !r.distributionRecord).length;

  return (
    <AccessShell
      title="Distribution"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Staff", href: "/access/staff" },
        { label: "Distribution" },
      ]}
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Distribution Health</h2>
          <p className="text-[11px] text-white/30 mt-1">
            Delivery status for all active releases.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5">
          {[
            { label: "Live", value: liveCount, color: "text-green-400" },
            { label: "Delivered", value: deliveredCount, color: "text-blue-400/80" },
            { label: "Pending", value: pendingCount, color: pendingCount > 0 ? "text-yellow-400/70" : "text-white/30" },
            { label: "No Record", value: noRecord, color: noRecord > 0 ? "text-red-400/60" : "text-white/30" },
          ].map((s) => (
            <div key={s.label} className="bg-black px-4 py-4">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="border border-white/5 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
              <span className="col-span-3">Release</span>
              <span className="col-span-2">Artist</span>
              <span className="col-span-1">Type</span>
              <span className="col-span-2">Date</span>
              <span className="col-span-2">Distributor</span>
              <span className="col-span-1">UPC</span>
              <span className="col-span-1">Status</span>
            </div>
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[11px] text-white/20">No releases in catalog.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                  >
                    <div className="col-span-3 min-w-0">
                      <p className="text-[11px] text-white/60 truncate">{r.title}</p>
                    </div>
                    <p className="col-span-2 text-[10px] text-white/35 truncate">{r.artistName}</p>
                    <p className="col-span-1 text-[9px] text-white/25">{r.type}</p>
                    <p className="col-span-2 text-[9px] font-mono text-white/25">{r.releaseDate.slice(0, 10)}</p>
                    <p className="col-span-2 text-[10px] text-white/35">{r.distributionRecord?.distributor ?? "—"}</p>
                    <p className="col-span-1 text-[9px] font-mono text-white/25 truncate">
                      {r.distributionRecord?.upc ?? "—"}
                    </p>
                    <div className="col-span-1">
                      <span className={`text-[8px] tracking-[0.1em] uppercase border px-1 py-0.5 ${
                        r.distributionRecord?.deliveryStatus === "live"
                          ? "border-green-800/40 text-green-400/50"
                          : r.distributionRecord?.deliveryStatus === "delivered"
                          ? "border-blue-800/40 text-blue-400/50"
                          : r.distributionRecord?.deliveryStatus === "pending"
                          ? "border-yellow-800/40 text-yellow-400/50"
                          : r.distributionRecord
                          ? "border-white/10 text-white/25"
                          : "border-red-800/30 text-red-400/40"
                      }`}>
                        {r.distributionRecord?.deliveryStatus ?? "None"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AccessShell>
  );
}
