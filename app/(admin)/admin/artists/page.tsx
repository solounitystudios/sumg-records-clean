"use client";
import { AdminShell } from "@/components/admin/AdminShell";
import { EntityTable } from "@/components/admin/EntityTable";
import { artists } from "@/data/artists";

export default function AdminArtists() {
  return (
    <AdminShell title="Artists">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {artists.length} Artist{artists.length !== 1 ? "s" : ""}
          </p>
          <button className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all duration-200">
            + Add Artist
          </button>
        </div>
        <EntityTable
          data={artists}
          columns={[
            { key: "name", label: "Name" },
            { key: "genre", label: "Genre" },
            { key: "tier", label: "Tier", render: (row) => <span className="capitalize">{row.tier}</span> },
            { key: "featured", label: "Featured", render: (row) => (
              <span className={row.featured ? "text-green-500/70" : "text-white/20"}>
                {row.featured ? "Yes" : "No"}
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
