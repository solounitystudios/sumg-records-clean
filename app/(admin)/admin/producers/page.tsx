"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EntityTable } from "@/components/admin/EntityTable";
import { useCmsStore } from "@/lib/cms/store";

export default function AdminProducers() {
  const router = useRouter();
  const { producers, deleteProducer, notify } = useCmsStore();

  function handleDelete(id: string) {
    if (confirm("Delete this producer? This cannot be undone.")) {
      deleteProducer(id);
      notify("success", "Producer deleted.");
    }
  }

  return (
    <AdminShell title="Producers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {producers.length} Producer{producers.length !== 1 ? "s" : ""}
          </p>
          <Link
            href="/admin/producers/new"
            className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all duration-200"
          >
            + New Producer
          </Link>
        </div>
        <EntityTable
          data={producers}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => (
                <Link
                  href={`/admin/producers/${row.slug}`}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  {row.name}
                </Link>
              ),
            },
            { key: "specialty", label: "Specialty" },
            { key: "credits", label: "Credits" },
          ]}
          onEdit={(id) => {
            const p = producers.find((x) => x.id === id);
            if (p) router.push(`/admin/producers/${p.slug}`);
          }}
          onDelete={handleDelete}
        />
      </div>
    </AdminShell>
  );
}
