"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EntityTable } from "@/components/admin/EntityTable";
import { StatusBadge } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";

export default function AdminArtists() {
  const router = useRouter();
  const { artists, deleteArtist, notify } = useCmsStore();

  function handleDelete(id: string) {
    if (confirm("Delete this artist? This cannot be undone.")) {
      deleteArtist(id);
      notify("success", "Artist deleted.");
    }
  }

  return (
    <AdminShell title="Artists">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {artists.length} Artist{artists.length !== 1 ? "s" : ""}
          </p>
          <Link
            href="/admin/artists/new"
            className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all duration-200"
          >
            + New Artist
          </Link>
        </div>
        <EntityTable
          data={artists}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => (
                <Link
                  href={`/admin/artists/${row.slug}`}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  {row.name}
                </Link>
              ),
            },
            { key: "genre", label: "Genre" },
            { key: "tier", label: "Tier", render: (row) => <span className="capitalize">{row.tier}</span> },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge status={row.status ?? "active"} />,
            },
            {
              key: "featured",
              label: "Featured",
              render: (row) => (
                <span className={row.featured ? "text-green-500/70" : "text-white/20"}>
                  {row.featured ? "Yes" : "—"}
                </span>
              ),
            },
          ]}
          onEdit={(id) => {
            const artist = artists.find((a) => a.id === id);
            if (artist) router.push(`/admin/artists/${artist.slug}`);
          }}
          onDelete={handleDelete}
        />
      </div>
    </AdminShell>
  );
}
