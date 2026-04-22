"use client";

import { AccessShell } from "@/components/access/AccessShell";

/**
 * /access/artist/media — Personal media library.
 * Phase 2: Artist-scoped upload zone for profile images and audio.
 */
export default function ArtistMediaPage() {
  return (
    <AccessShell
      title="Media"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist", href: "/access/artist" },
        { label: "Media" },
      ]}
    >
      <div className="max-w-xl space-y-8">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Media Library</h2>
          <p className="text-[11px] text-white/30 mt-1">
            Your personal image and audio assets.
          </p>
        </div>

        <div className="border border-white/5 p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-white/5 flex items-center justify-center">
            <span className="text-2xl text-white/15">◒</span>
          </div>
          <div>
            <p className="text-[12px] text-white/40 font-medium">Media Upload</p>
            <p className="text-[11px] text-white/25 mt-1 leading-relaxed max-w-xs mx-auto">
              Artist-scoped media uploads — profile images, promo photos, and audio previews —
              are coming in Phase 2.
            </p>
          </div>
        </div>

        <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 mb-1.5">In the meantime</p>
          <p className="text-[11px] text-white/35 leading-relaxed">
            To update your profile image or upload press photos, contact your label manager.
            Media assets managed through the CMS are automatically linked to your artist profile.
          </p>
        </div>
      </div>
    </AccessShell>
  );
}
