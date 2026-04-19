"use client";
import { AdminShell } from "@/components/admin/AdminShell";
import { EntityTable } from "@/components/admin/EntityTable";
import { releases } from "@/data/releases";

const statusColors: Record<string, string> = {
  published: "text-green-500/70",
  draft: "text-white/30",
  scheduled: "text-yellow-500/70",
};

export default function AdminReleases() {
  return (
    <AdminShell title="Releases">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {releases.length} Release{releases.length !== 1 ? "s" : ""}
          </p>
          <button className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all duration-200">
            + Add Release
          </button>
        </div>
        <EntityTable
          data={releases}
          columns={[
            { key: "title", label: "Title" },
            { key: "artistName", label: "Artist" },
            { key: "type", label: "Type" },
            { key: "releaseDate", label: "Date" },
            { key: "status", label: "Status", render: (row) => (
              <span className={`capitalize ${statusColors[row.status] ?? "text-white/30"}`}>
                {row.status}
              </span>
            )},
            { key: "isVisible", label: "Visible", render: (row) => (
              <span className={row.isVisible ? "text-green-500/70" : "text-red-500/70"}>
                {row.isVisible ? "Yes" : "No"}
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
