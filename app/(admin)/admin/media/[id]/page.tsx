"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton, DangerButton } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";
import { useState, useEffect } from "react";
import { CMSAsset } from "@/lib/types";

export default function MediaAssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { getAssetById, updateAsset, deleteAsset, notify } = useCmsStore();

  const asset = getAssetById(id);
  const [form, setForm] = useState<{ altText: string } | null>(null);

  useEffect(() => {
    if (!asset) return;
    setForm({ altText: asset.altText ?? "" });
  }, [asset]);

  if (!asset || !form) {
    return (
      <AdminShell title="Asset Not Found">
        <p className="text-white/30 text-sm">Asset not found.</p>
        <a href="/admin/media" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white mt-4 block transition-colors">
          ← Media Library
        </a>
      </AdminShell>
    );
  }

  function handleSave() {
    updateAsset(asset!.id, { altText: form!.altText });
    notify("success", "Asset updated.");
  }

  function handleDelete() {
    if (confirm("Delete this asset? This cannot be undone.")) {
      deleteAsset(asset!.id);
      notify("success", "Asset deleted.");
      window.location.href = "/admin/media";
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(asset!.url).then(() => notify("info", "URL copied."));
  }

  return (
    <AdminShell title="Asset Detail">
      <div className="max-w-xl space-y-10">
        <a href="/admin/media" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
          ← Media Library
        </a>

        {/* Preview */}
        <div className="border border-white/5 aspect-video flex items-center justify-center overflow-hidden bg-white/[0.02]">
          {asset.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={asset.altText ?? asset.filename} className="max-w-full max-h-full object-contain" />
          ) : asset.type === "audio" ? (
            <audio controls src={asset.url} className="w-full px-6" />
          ) : asset.type === "video" ? (
            <video controls src={asset.url} className="max-w-full max-h-full" />
          ) : (
            <p className="text-white/20 text-xs italic">No preview available</p>
          )}
        </div>

        {/* Metadata */}
        <FormSection title="File Info">
          <div className="space-y-1 text-xs text-white/40">
            <p><span className="text-white/20">Filename:</span> {asset.filename}</p>
            <p><span className="text-white/20">Type:</span> {asset.type}</p>
            <p><span className="text-white/20">MIME:</span> {asset.mimeType}</p>
            {asset.sizeBytes && (
              <p><span className="text-white/20">Size:</span> {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
            )}
            <p><span className="text-white/20">Uploaded:</span> {new Date(asset.createdAt).toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={copyUrl}
            className="mt-3 border border-white/10 px-4 py-2 text-[10px] tracking-[0.15em] uppercase text-white/40 hover:text-white hover:border-white/25 transition-colors"
          >
            Copy URL
          </button>
        </FormSection>

        {/* Edit */}
        <FormSection title="Edit">
          <FormField
            type="textarea"
            label="Alt Text"
            rows={2}
            value={form.altText}
            placeholder="Describe this asset for accessibility…"
            onChange={(v) => setForm({ altText: v })}
          />
        </FormSection>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <SaveButton onClick={handleSave} />
          <DangerButton onClick={handleDelete} label="Delete Asset" />
        </div>
      </div>
    </AdminShell>
  );
}
