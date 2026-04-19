"use client";
import { AdminShell } from "@/components/admin/AdminShell";
import { MediaUploader } from "@/components/admin/MediaUploader";

export default function AdminMedia() {
  return (
    <AdminShell title="Media Library">
      <div className="space-y-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">Upload & Replace Assets</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-white/5 p-6 space-y-6">
            <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-white/50">Images</h2>
            <MediaUploader type="image" label="Hero Image" />
            <MediaUploader type="image" label="Artist Profile Photo" />
            <MediaUploader type="image" label="Release Cover Art" />
          </div>

          <div className="border border-white/5 p-6 space-y-6">
            <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-white/50">Audio</h2>
            <MediaUploader type="audio" label="Upload Audio Track" />
          </div>

          <div className="border border-white/5 p-6 space-y-6 md:col-span-2">
            <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-white/50">Video</h2>
            <MediaUploader type="video" label="Upload Video Asset" />
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/15 mb-4">Media Library</p>
          <div className="border border-white/5 p-10 text-center">
            <p className="text-xs text-white/20 italic">Media storage not yet configured. Connect Supabase Storage or S3 in Phase 4.</p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
