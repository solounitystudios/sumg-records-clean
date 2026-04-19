"use client";

import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton, DangerButton } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";
import { useState, useEffect } from "react";
import { AssetAttachment } from "@/lib/types";

// ─── Attachment row ───────────────────────────────────────────────────────────

function AttachmentRow({
  attachment,
  label,
  onDetach,
}: {
  attachment: AssetAttachment;
  label: string;
  onDetach: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04]">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/60 truncate">{label}</p>
        <p className="text-[10px] text-white/20 capitalize">
          {attachment.entityType} · {attachment.role}
        </p>
      </div>
      <button
        type="button"
        onClick={onDetach}
        className="text-[10px] text-red-900 hover:text-red-400 transition-colors px-2 flex-shrink-0"
      >
        Detach
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MediaAssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const {
    getAssetById,
    updateAsset,
    deleteAsset,
    attachAssetToEntity,
    detachAssetFromEntity,
    notify,
    artists,
    producers,
    brands,
    releases,
  } = useCmsStore();

  const asset = getAssetById(id);
  const [form, setForm] = useState<{ altText: string } | null>(null);

  // Attachment form state
  const [attachEntityType, setAttachEntityType] =
    useState<AssetAttachment["entityType"]>("release");
  const [attachEntityId, setAttachEntityId] = useState("");
  const [attachRole, setAttachRole] =
    useState<AssetAttachment["role"]>("gallery");

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

  // Build entity option lists
  const entityOptions: { value: string; label: string }[] =
    attachEntityType === "artist"
      ? artists.map((a) => ({ value: a.id, label: a.name }))
      : attachEntityType === "producer"
      ? producers.map((p) => ({ value: p.id, label: p.name }))
      : attachEntityType === "brand"
      ? brands.map((b) => ({ value: b.id, label: b.name }))
      : releases.map((r) => ({ value: r.id, label: r.title }));

  // Role options per entity type
  const roleOptions: AssetAttachment["role"][] =
    attachEntityType === "artist" || attachEntityType === "producer"
      ? ["hero", "profile", "gallery"]
      : attachEntityType === "brand"
      ? ["hero", "gallery"]
      : ["cover", "gallery", "video", "audio"];

  function handleAttach() {
    if (!attachEntityId) {
      notify("error", "Select an entity to attach to.");
      return;
    }
    attachAssetToEntity(asset!.id, {
      entityType: attachEntityType,
      entityId: attachEntityId,
      role: attachRole,
    });
    const entityName =
      entityOptions.find((o) => o.value === attachEntityId)?.label ?? attachEntityId;
    notify("success", `Attached to ${attachEntityType} "${entityName}" as ${attachRole}.`);
    setAttachEntityId("");
  }

  function handleDetach(entityType: AssetAttachment["entityType"], entityId: string) {
    detachAssetFromEntity(asset!.id, entityType, entityId);
    notify("info", "Attachment removed.");
  }

  // Labels for existing attachments
  function entityLabel(att: AssetAttachment): string {
    let list: { id: string; name?: string; title?: string }[] = [];
    if (att.entityType === "artist") list = artists;
    else if (att.entityType === "producer") list = producers;
    else if (att.entityType === "brand") list = brands;
    else list = releases.map((r) => ({ ...r, name: r.title }));
    const match = list.find((e) => e.id === att.entityId);
    return (match as { name?: string; title?: string })?.name
      ?? (match as { title?: string })?.title
      ?? att.entityId;
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

        {/* Edit alt text */}
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

        {/* Current attachments */}
        {(asset.attachedTo ?? []).length > 0 && (
          <FormSection title="Attached To">
            <div>
              {(asset.attachedTo ?? []).map((att, i) => (
                <AttachmentRow
                  key={`${att.entityType}-${att.entityId}-${att.role}-${i}`}
                  attachment={att}
                  label={entityLabel(att)}
                  onDetach={() => handleDetach(att.entityType, att.entityId)}
                />
              ))}
            </div>
          </FormSection>
        )}

        {/* Attach to entity */}
        <FormSection title="Attach to Entity">
          <div className="space-y-4">
            {/* Entity type */}
            <div className="flex gap-2">
              {(["release", "artist", "producer", "brand"] as AssetAttachment["entityType"][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setAttachEntityType(t); setAttachEntityId(""); setAttachRole(t === "release" ? "cover" : "hero"); }}
                  className={`border px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase transition-colors ${
                    attachEntityType === t
                      ? "border-white/30 text-white bg-white/[0.04]"
                      : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/60"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Entity picker */}
            <select
              value={attachEntityId}
              onChange={(e) => setAttachEntityId(e.target.value)}
              className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
            >
              <option value="" className="bg-neutral-900">— Select {attachEntityType} —</option>
              {entityOptions.map((o) => (
                <option key={o.value} value={o.value} className="bg-neutral-900">
                  {o.label}
                </option>
              ))}
            </select>

            {/* Role picker */}
            <div className="flex items-center gap-3">
              <p className="text-[10px] tracking-wider uppercase text-white/20 w-10 flex-shrink-0">Role</p>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAttachRole(r)}
                    className={`border px-3 py-1 text-[10px] tracking-wider uppercase transition-colors ${
                      attachRole === r
                        ? "border-white/30 text-white"
                        : "border-white/10 text-white/30 hover:border-white/20"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAttach}
              disabled={!attachEntityId}
              className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.15em] uppercase text-white/50 hover:border-white/25 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Attach
            </button>
          </div>
        </FormSection>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <SaveButton onClick={handleSave} />
          <DangerButton onClick={handleDelete} label="Delete Asset" />
        </div>
      </div>
    </AdminShell>
  );
}

