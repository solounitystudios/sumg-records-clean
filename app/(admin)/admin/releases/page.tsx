"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EntityTable } from "@/components/admin/EntityTable";
import { StatusBadge } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";

const TABS = ["all", "draft", "scheduled", "published", "archived"] as const;
type Tab = typeof TABS[number];

export default function AdminReleases() {
  const router = useRouter();
  const { releases, deleteRelease, publishRelease, notify } = useCmsStore();
  const [tab, setTab] = useState<Tab>("all");

  const filtered =
    tab === "all" ? releases : releases.filter((r) => r.status === tab);

  function handleDelete(id: string) {
    if (confirm("Delete this release? This cannot be undone.")) {
      deleteRelease(id);
      notify("success", "Release deleted.");
    }
  }

  function handlePublish(id: string, title: string) {
    if (confirm(`Publish "${title}" now? It will become visible on the public site.`)) {
      publishRelease(id);
      notify("success", `"${title}" published and is now live.`);
    }
  }

  return (
    <AdminShell title="Releases">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            {releases.length} Release{releases.length !== 1 ? "s" : ""}
          </p>
          <Link
            href="/admin/releases/new"
            className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-all duration-200"
          >
            + New Release
          </Link>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 border-b border-white/5 pb-0">
          {TABS.map((t) => {
            const count = t === "all" ? releases.length : releases.filter((r) => r.status === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase transition-colors border-b-2 ${
                  tab === t
                    ? "text-white border-white/40"
                    : "text-white/30 border-transparent hover:text-white/60"
                }`}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>

        <EntityTable
          data={filtered}
          columns={[
            {
              key: "title",
              label: "Title",
              render: (row) => (
                <Link
                  href={`/admin/releases/${row.slug}`}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  {row.title}
                </Link>
              ),
            },
            { key: "artistName", label: "Artist" },
            { key: "type", label: "Type" },
            { key: "releaseDate", label: "Date" },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: "isVisible",
              label: "Visible",
              render: (row) => (
                <span className={row.isVisible ? "text-green-500/70" : "text-red-500/70"}>
                  {row.isVisible ? "Yes" : "—"}
                </span>
              ),
            },
            {
              key: "id",
              label: "Quick Publish",
              render: (row) =>
                row.status !== "published" ? (
                  <button
                    onClick={() => handlePublish(row.id, row.title)}
                    className="text-[10px] tracking-[0.1em] uppercase text-yellow-500/60 hover:text-yellow-400 transition-colors"
                  >
                    Publish
                  </button>
                ) : (
                  <span className="text-[10px] text-white/15">Live</span>
                ),
            },
          ]}
          onEdit={(id) => {
            const r = releases.find((x) => x.id === id);
            if (r) router.push(`/admin/releases/${r.slug}`);
          }}
          onDelete={handleDelete}
        />
      </div>
    </AdminShell>
  );
}
