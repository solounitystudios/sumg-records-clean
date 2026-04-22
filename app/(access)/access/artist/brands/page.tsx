"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

export default function ArtistBrandsPage() {
  const user = useAccessUser();
  const { artists, brands } = useCmsStore();

  const artistSlug = user.artistSlug ?? "";

  const artist = useMemo(() => artists.find((a) => a.slug === artistSlug), [artists, artistSlug]);

  const associatedBrands = useMemo(() => {
    const slugs: string[] = Array.isArray(artist?.associatedBrands) ? (artist?.associatedBrands as string[]) : [];
    return brands.filter((b) => slugs.includes(b.slug) && b.isActive);
  }, [artist, brands]);

  const allActiveBrands = useMemo(() => brands.filter((b) => b.isActive), [brands]);

  return (
    <AccessShell
      title="Brands"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist", href: "/access/artist" },
        { label: "Brands" },
      ]}
    >
      <div className="space-y-10">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Brand Worlds</h2>
          <p className="text-[11px] text-white/30 mt-1">
            SUMG's five brand ecosystems you are associated with.
          </p>
        </div>

        {/* Associated brands */}
        {associatedBrands.length > 0 ? (
          <div>
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-4">Your Brands</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/5">
              {associatedBrands.map((brand) => (
                <a
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black p-6 hover:bg-white/[0.03] transition-colors block"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {brand.logoUrl && (
                      <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 object-contain" />
                    )}
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-0.5">
                        {brand.category}
                      </p>
                      <p className="text-sm font-semibold text-white/80">{brand.name}</p>
                    </div>
                    {brand.campaignStatus === "active" && (
                      <span className="ml-auto text-[8px] tracking-[0.15em] uppercase border border-green-800/40 text-green-400/60 px-1.5 py-0.5">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2">
                    {brand.descriptor || brand.tagline}
                  </p>
                  {brand.collectionName && (
                    <p className="text-[10px] text-white/20 mt-2">{brand.collectionName}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-white/5 py-10 text-center">
            <p className="text-[12px] text-white/20">No brand associations yet.</p>
            <p className="text-[10px] text-white/15 mt-1">
              Contact your label manager to link your artist to a brand.
            </p>
          </div>
        )}

        {/* All SUMG brands (read-only overview) */}
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-4">
            All SUMG Brand Worlds
          </p>
          <div className="border border-white/5 divide-y divide-white/[0.04]">
            {allActiveBrands.map((brand) => {
              const isAssociated = associatedBrands.some((b) => b.id === brand.id);
              return (
                <div
                  key={brand.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-[11px] text-white/60">{brand.name}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{brand.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAssociated && (
                      <span className="text-[8px] tracking-[0.15em] uppercase border border-white/15 text-white/40 px-1.5 py-0.5">
                        You
                      </span>
                    )}
                    <a
                      href={`/brands/${brand.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] tracking-[0.15em] uppercase text-white/20 hover:text-white transition-colors"
                    >
                      View →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AccessShell>
  );
}
