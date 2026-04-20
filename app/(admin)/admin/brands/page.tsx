"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EntityTable } from "@/components/admin/EntityTable";
import { useCmsStore } from "@/lib/cms/store";

export default function AdminBrands() {
  const router = useRouter();
  const { brands, deleteBrand, notify } = useCmsStore();

  function handleDelete(id: string) {
    if (confirm("Delete this brand? This cannot be undone.")) {
      deleteBrand(id);
      notify("success", "Brand deleted.");
    }
  }

  return (
    <AdminShell title="Brands">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
              {brands.length} Brand World{brands.length !== 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-white/20 mt-1">
              Brands are commerce and editorial identities. Music content (songs, releases) is managed separately in the music catalog.
            </p>
          </div>
          <Link
            href="/admin/brands/new"
            className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all duration-200"
          >
            + New Brand
          </Link>
        </div>
        <EntityTable
          data={brands}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => (
                <Link href={`/admin/brands/${row.slug}`} className="text-white/80 hover:text-white transition-colors">
                  {row.name}
                </Link>
              ),
            },
            { key: "category", label: "Category" },
            { key: "tagline", label: "Tagline" },
            {
              key: "isActive",
              label: "Status",
              render: (row) => (
                <span className={row.isActive ? "text-green-500/70" : "text-red-500/70"}>
                  {row.isActive ? "Active" : "Inactive"}
                </span>
              ),
            },
          ]}
          onEdit={(id) => {
            const b = brands.find((x) => x.id === id);
            if (b) router.push(`/admin/brands/${b.slug}`);
          }}
          onDelete={handleDelete}
        />
      </div>
    </AdminShell>
  );
}
