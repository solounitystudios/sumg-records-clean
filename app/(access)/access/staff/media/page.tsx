"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useCmsStore } from "@/lib/cms/store";

export default function StaffMediaPage() {
  const { assets } = useCmsStore();

  const byType = useMemo(() => {
    const image = assets.filter((a) => a.type === "image");
    const audio = assets.filter((a) => a.type === "audio");
    const other = assets.filter((a) => a.type !== "image" && a.type !== "audio");
    return { image, audio, other };
  }, [assets]);

  const recentAssets = useMemo(
    () => [...assets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12),
    [assets]
  );

  return (
    <AccessShell
      title="Media"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Staff", href: "/access/staff" },
        { label: "Media" },
      ]}
    >
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Global Media Library</h2>
            <p className="text-[11px] text-white/30 mt-1">
              All media assets across artists, releases, and brands.
            </p>
          </div>
          <Link
            href="/admin/media"
            className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/25 hover:text-white/70 transition-all flex-shrink-0"
          >
            Manage in CMS →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-white/5">
          {[
            { label: "Images", value: byType.image.length },
            { label: "Audio", value: byType.audio.length },
            { label: "Other", value: byType.other.length },
          ].map((s) => (
            <div key={s.label} className="bg-black px-4 py-4">
              <p className="text-2xl font-black text-white/70">{s.value}</p>
              <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent assets grid */}
        {recentAssets.length > 0 && (
          <div>
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">Recent Assets</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1">
              {recentAssets.map((asset) => (
                <div key={asset.id} className="aspect-square bg-white/5 overflow-hidden relative group">
                  {asset.type === "image" ? (
                    <img
                      src={asset.url}
                      alt={asset.altText ?? asset.filename}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <span className="text-2xl text-white/15">
                        {asset.type === "audio" ? "♫" : "◒"}
                      </span>
                      <p className="text-[7px] text-white/20 mt-1 px-1 text-center truncate w-full">
                        {asset.filename}
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80">
                    <p className="text-[7px] text-white/60 truncate">{asset.filename}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {assets.length === 0 && (
          <div className="border border-white/5 py-12 text-center">
            <p className="text-[12px] text-white/20">No assets in library.</p>
          </div>
        )}
      </div>
    </AccessShell>
  );
}
