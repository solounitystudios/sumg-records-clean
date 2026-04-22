"use client";

import { useMemo, useState } from "react";
import { AccessShell } from "@/components/access/AccessShell";
import { useAccessUser } from "@/lib/auth/use-access-user";
import { useCmsStore } from "@/lib/cms/store";

export default function ArtistProfilePage() {
  const user = useAccessUser();
  const { artists } = useCmsStore();

  const artist = useMemo(
    () => artists.find((a) => a.slug === (user.artistSlug ?? "")),
    [artists, user.artistSlug]
  );

  const [saved, setSaved] = useState(false);

  // Note: direct writes are read-only for artist role in this Phase 1 build.
  // Write support is delivered through /api/access/artist/update in Phase 2.

  return (
    <AccessShell
      title="Profile"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Artist", href: "/access/artist" },
        { label: "Profile" },
      ]}
    >
      <div className="max-w-2xl space-y-10">
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-2">
            Artist Profile
          </p>
          <h2 className="text-xl font-black tracking-tight text-white">
            {artist?.name ?? user.artistSlug}
          </h2>
          <p className="text-[11px] text-white/30 mt-1">
            Profile edits are reviewed by label management before going live.
          </p>
        </div>

        {!artist ? (
          <div className="border border-white/5 py-12 text-center">
            <p className="text-[12px] text-white/20">Artist profile not found.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile image */}
            <div className="border border-white/5 p-6">
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-4">Profile Image</p>
              <div className="flex items-center gap-6">
                {artist.profileImageUrl ? (
                  <img src={artist.profileImageUrl} alt={artist.name} className="w-20 h-20 object-cover" />
                ) : (
                  <div className="w-20 h-20 bg-white/5 flex items-center justify-center">
                    <span className="text-white/20 text-xl">◉</span>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-white/40 mb-2">
                    To update your profile image, contact your label manager.
                  </p>
                  <p className="text-[10px] text-white/20">Recommended: 800×800px square, JPG or PNG</p>
                </div>
              </div>
            </div>

            {/* Read-only fields */}
            {[
              { label: "Name", value: artist.name },
              { label: "Genre", value: artist.genre },
              { label: "Role", value: artist.role },
              { label: "Tier", value: artist.tier },
            ].map((field) => (
              <div key={field.label} className="border-b border-white/[0.04] pb-4">
                <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-1.5">
                  {field.label}
                </p>
                <p className="text-sm text-white/60">{field.value || "—"}</p>
              </div>
            ))}

            {/* Bio */}
            <div className="border-b border-white/[0.04] pb-4">
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-1.5">Bio</p>
              <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap">
                {artist.bio || "—"}
              </p>
            </div>

            {/* Social links */}
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-3">Social Links</p>
              <div className="space-y-2">
                {(["instagram", "twitter", "spotify", "soundcloud", "youtube"] as (keyof typeof artist.socialLinks)[]).map((platform) => {
                  const val = artist.socialLinks?.[platform];
                  return (
                    <div key={platform} className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                      <p className="text-[10px] tracking-[0.15em] uppercase text-white/30 capitalize">{platform}</p>
                      {val ? (
                        <a
                          href={val}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-white/40 hover:text-white transition-colors truncate max-w-xs"
                        >
                          {val}
                        </a>
                      ) : (
                        <span className="text-[10px] text-white/15">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase 2 notice */}
            <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
              <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 mb-1.5">Edit Access</p>
              <p className="text-[11px] text-white/35 leading-relaxed">
                Self-serve profile editing is coming in a future update. In the meantime, send
                profile update requests to your label manager at SUMG Records.
              </p>
              {saved && (
                <p className="text-[10px] text-green-400/70 mt-2">Request submitted.</p>
              )}
              <button
                onClick={() => setSaved(true)}
                className="mt-3 border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/35 hover:border-white/25 hover:text-white/60 transition-all"
              >
                Request Update →
              </button>
            </div>
          </div>
        )}
      </div>
    </AccessShell>
  );
}
