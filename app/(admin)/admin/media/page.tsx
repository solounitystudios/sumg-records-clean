"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { MediaLibraryGrid } from "@/components/admin/MediaLibraryGrid";
import { useCmsStore } from "@/lib/cms/store";
import { AssetType } from "@/lib/types";

export default function AdminMedia() {
  const { addAsset, notify } = useCmsStore();
  const [uploadPanel, setUploadPanel] = useState<AssetType | null>(null);

  async function handleUpload(file: File, type: AssetType) {
    // In Phase 4, call the real upload API here.
    // For now, create a local object URL as a preview.
    const url = URL.createObjectURL(file);
    addAsset({
      type,
      url,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      altText: "",
      attachedTo: [],
      uploadedBy: "admin",
    });
    notify("success", `"${file.name}" added to media library.`);
    setUploadPanel(null);
  }

  return (
    <AdminShell title="Media Library">
      <div className="space-y-8">

        {/* Upload panel trigger */}
        <div className="flex items-center gap-3">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 flex-1">
            Asset Library
          </p>
          {(["image", "video", "audio"] as AssetType[]).map((t) => (
            <button
              key={t}
              onClick={() => setUploadPanel(uploadPanel === t ? null : t)}
              className={`border px-4 py-2 text-[10px] tracking-[0.15em] uppercase transition-colors ${
                uploadPanel === t
                  ? "border-white/20 text-white"
                  : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
              }`}
            >
              Upload {t}
            </button>
          ))}
        </div>

        {/* Upload drawer */}
        {uploadPanel && (
          <div className="border border-white/10 p-6 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/40 capitalize">
                Upload {uploadPanel}
              </p>
              <button
                onClick={() => setUploadPanel(null)}
                className="text-white/25 hover:text-white text-xs transition-colors"
              >
                ✕ Close
              </button>
            </div>
            <MediaUploader
              type={uploadPanel}
              label={`Select ${uploadPanel} file`}
              onUpload={(file) => handleUpload(file, uploadPanel)}
            />
          </div>
        )}

        {/* Library grid */}
        <MediaLibraryGrid />

        {/* Phase 4 note */}
        <div className="border-t border-white/5 pt-6">
          <p className="text-[10px] text-white/15 italic">
            Phase 4: Connect Supabase Storage or S3 to persist uploads. Local object URLs reset on page reload.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
