"use client";
import { AdminShell } from "@/components/admin/AdminShell";
import { EntityTable } from "@/components/admin/EntityTable";
import { producers } from "@/data/producers";

export default function AdminProducers() {
  return (
    <AdminShell title="Producers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {producers.length} Producer{producers.length !== 1 ? "s" : ""}
          </p>
          <button className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all duration-200">
            + Add Producer
          </button>
        </div>
        <EntityTable
          data={producers}
          columns={[
            { key: "name", label: "Name" },
            { key: "specialty", label: "Specialty" },
            { key: "credits", label: "Credits" },
          ]}
          onEdit={(id) => console.log("Edit", id)}
          onDelete={(id) => console.log("Delete", id)}
        />
      </div>
    </AdminShell>
  );
}
