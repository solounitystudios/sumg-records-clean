"use client";
import { AdminShell } from "@/components/admin/AdminShell";
import { EntityTable } from "@/components/admin/EntityTable";
import { brands } from "@/data/brands";

export default function AdminBrands() {
  return (
    <AdminShell title="Brands">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {brands.length} Brand World{brands.length !== 1 ? "s" : ""}
          </p>
          <button className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all duration-200">
            + Add Brand
          </button>
        </div>
        <EntityTable
          data={brands}
          columns={[
            { key: "name", label: "Name" },
            { key: "category", label: "Category" },
            { key: "tagline", label: "Tagline" },
            { key: "isActive", label: "Status", render: (row) => (
              <span className={row.isActive ? "text-green-500/70" : "text-red-500/70"}>
                {row.isActive ? "Active" : "Inactive"}
              </span>
            )},
          ]}
          onEdit={(id) => console.log("Edit", id)}
          onDelete={(id) => console.log("Delete", id)}
        />
      </div>
    </AdminShell>
  );
}
