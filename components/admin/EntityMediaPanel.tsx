"use client";

/**
 * EntityMediaPanel
 *
 * A self-contained, reusable panel that lets admins:
 *   • Upload a new asset (direct file → Supabase Storage or local blob fallback)
 *   • Attach an existing asset from the media library
 *   • Preview currently-attached assets (grid for gallery, single for hero/cover)
 *   • Detach / remove an attached asset
 *
 * Roles:
 *   hero / profile / cover  → single-asset: upload + library-pick + preview + replace
 *   gallery / video         → multi-asset: grid preview + upload/attach + detach per item
 */

import { useRef, useState } from "react";
import { CMSAsset, AssetAttachment, AssetType } from "@/lib/types";
import { useCmsStore } from "@/lib/cms/store";
import { uploadAsset, ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EntityMediaPanelProps {
  /** Entity this panel manages assets for */
  entityType: AssetAttachment["entityType"];
  entityId: string;
  /** The role/slot being managed (hero, gallery, video, cover, profile) */
  role: AssetAttachment["role"];
  /** Friendly heading shown above the panel */
  title: string;
  /** Which file types to accept for upload */
  assetType: AssetType;
  /** Allow multiple assets (gallery/video) vs single (hero/cover/profile) */
  allowMultiple?: boolean;
  /** Whether the current user can upload/delete (based on useRole().canUploadMedia) */
  canUpload: boolean;
  /**
   * Called whenever the "primary" asset URL changes so the parent
   * form can update its own field (e.g. heroImageUrl, coverArtUrl).
   */
  onPrimaryUrlChange?: (url: string | undefined) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function acceptString(type: AssetType): string {
  if (type === "image") return ACCEPTED_IMAGE_TYPES.join(",");
  if (type === "video") return ACCEPTED_VIDEO_TYPES.join(",");
  return "*/*";
}

function maxSize(type: AssetType): number {
  if (type === "video") return MAX_VIDEO_SIZE;
  return MAX_IMAGE_SIZE;
}

function maxLabel(type: AssetType): string {
  if (type === "video") return "500 MB";
  return "10 MB";
}

// ─── Library Picker (inline expandable) ──────────────────────────────────────

function LibraryPicker({
  assetType,
  onPick,
  onClose,
}: {
  assetType: AssetType;
  onPick: (asset: CMSAsset) => void;
  onClose: () => void;
}) {
  const { assets } = useCmsStore();
  const [search, setSearch] = useState("");
  const filtered = assets.filter(
    (a) =>
      a.type === assetType &&
      (!search || a.filename.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
          Pick from Library
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-white/25 hover:text-white text-xs transition-colors"
        >
          ✕
        </button>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search assets…"
        className="w-full bg-transparent border border-white/10 px-3 py-1.5 text-[11px] text-white placeholder-white/20 focus:border-white/25 focus:outline-none"
      />
      {filtered.length === 0 ? (
        <p className="text-[10px] text-white/20 italic py-2">
          No {assetType} assets in library.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a)}
              className="group border border-white/[0.06] hover:border-white/25 transition-all aspect-square overflow-hidden bg-white/[0.01] flex items-center justify-center"
              title={a.filename}
            >
              {a.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt={a.altText ?? a.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl text-white/20">
                  {a.type === "video" ? "▶" : "▤"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single asset preview ─────────────────────────────────────────────────────

function SinglePreview({
  asset,
  url,
  assetType,
  canUpload,
  onDetach,
}: {
  asset?: CMSAsset;
  url?: string;
  assetType: AssetType;
  canUpload: boolean;
  onDetach: () => void;
}) {
  const displayUrl = asset?.url ?? url;
  if (!displayUrl) return null;

  return (
    <div className="relative border border-white/10 bg-white/[0.02] overflow-hidden">
      {assetType === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt={asset?.altText ?? "preview"}
          className="w-full max-h-48 object-cover"
        />
      ) : assetType === "video" ? (
        <video
          src={displayUrl}
          className="w-full max-h-48 object-contain bg-black"
          controls={false}
          muted
        />
      ) : null}
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(displayUrl);
          }}
          title="Copy URL"
          className="bg-black/60 text-white/50 hover:text-white text-[10px] px-2 py-1 transition-colors"
        >
          ⎘
        </button>
        {canUpload && (
          <button
            type="button"
            onClick={onDetach}
            title="Remove"
            className="bg-black/60 text-red-900 hover:text-red-400 text-[10px] px-2 py-1 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
      {asset && (
        <div className="px-3 py-2 border-t border-white/5">
          <p className="text-[10px] text-white/30 truncate">{asset.filename}</p>
        </div>
      )}
    </div>
  );
}

// ─── Multi asset item ─────────────────────────────────────────────────────────

function MultiAssetItem({
  asset,
  canUpload,
  onDetach,
}: {
  asset: CMSAsset;
  canUpload: boolean;
  onDetach: (id: string) => void;
}) {
  return (
    <div className="group relative border border-white/[0.06] hover:border-white/15 transition-all overflow-hidden aspect-square">
      {asset.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.url}
          alt={asset.altText ?? asset.filename}
          className="w-full h-full object-cover"
        />
      ) : asset.type === "video" ? (
        <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
          <span className="text-2xl text-white/20">▶</span>
        </div>
      ) : null}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(asset.url)}
          className="text-[10px] text-white/60 hover:text-white transition-colors"
          title="Copy URL"
        >
          ⎘
        </button>
        {canUpload && (
          <button
            type="button"
            onClick={() => onDetach(asset.id)}
            className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
            title="Detach"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EntityMediaPanel({
  entityType,
  entityId,
  role,
  title,
  assetType,
  allowMultiple = false,
  canUpload,
  onPrimaryUrlChange,
}: EntityMediaPanelProps) {
  const {
    getAssetsForEntity,
    addAsset,
    attachAssetToEntity,
    detachAssetFromEntity,
    notify,
  } = useCmsStore();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live list of attached assets with the given role for this entity
  const attached = getAssetsForEntity(entityType, entityId).filter(
    (a) => a.attachedTo?.some((x) => x.role === role)
  );
  const primaryAsset = attached[0];

  // ── Upload handler ──────────────────────────────────────────────────────────
  async function handleFile(file: File) {
    setUploadError(null);
    const sizeLimit = maxSize(assetType);
    if (file.size > sizeLimit) {
      setUploadError(`File too large. Max ${maxLabel(assetType)}.`);
      return;
    }
    setUploading(true);

    // Resolve the actual user identity for the audit trail.
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const uploadedBy = user?.email ?? user?.id ?? "unknown";

    const result = await uploadAsset(file, assetType, uploadedBy);
    setUploading(false);

    const attachment: AssetAttachment = { entityType, entityId, role };

    let asset: CMSAsset;
    if (!result.success || !result.asset) {
      // Supabase storage not configured — create local-only asset
      const localUrl = URL.createObjectURL(file);
      asset = addAsset({
        type: assetType,
        url: localUrl,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy,
        attachedTo: [attachment],
      });
      notify("success", `"${file.name}" uploaded (local — storage not configured).`);
    } else {
      asset = addAsset({ ...result.asset, attachedTo: [attachment] });
      attachAssetToEntity(asset.id, attachment);
      notify("success", `"${file.name}" uploaded and linked.`);
    }
    onPrimaryUrlChange?.(asset.url);
  }

  // ── Library pick ────────────────────────────────────────────────────────────
  function handleLibraryPick(asset: CMSAsset) {
    const attachment: AssetAttachment = { entityType, entityId, role };
    attachAssetToEntity(asset.id, attachment);
    setShowLibrary(false);
    onPrimaryUrlChange?.(asset.url);
    notify("success", `"${asset.filename}" attached.`);
  }

  // ── Detach ──────────────────────────────────────────────────────────────────
  function handleDetach(assetId: string) {
    detachAssetFromEntity(assetId, entityType, entityId);
    // Update parent URL if this was the primary asset
    const remaining = attached.filter((a) => a.id !== assetId);
    onPrimaryUrlChange?.(remaining[0]?.url);
    notify("info", "Asset detached.");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">{title}</p>

      {/* Single-asset preview */}
      {!allowMultiple && primaryAsset && (
        <SinglePreview
          asset={primaryAsset}
          assetType={assetType}
          canUpload={canUpload}
          onDetach={() => handleDetach(primaryAsset.id)}
        />
      )}

      {/* Multi-asset grid */}
      {allowMultiple && attached.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {attached.map((a) => (
            <MultiAssetItem
              key={a.id}
              asset={a}
              canUpload={canUpload}
              onDetach={handleDetach}
            />
          ))}
        </div>
      )}

      {/* Upload zone + actions */}
      {canUpload && (
        <div className="space-y-2">
          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className="border border-dashed border-white/10 p-6 text-center cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-all duration-200"
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={acceptString(assetType)}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {uploading ? (
              <p className="text-[11px] tracking-[0.2em] uppercase text-white/40">
                Uploading…
              </p>
            ) : (
              <>
                <p className="text-[11px] tracking-[0.15em] uppercase text-white/30 mb-1">
                  {attached.length > 0 && !allowMultiple ? "Replace" : "Upload"}{" "}
                  {assetType}
                </p>
                <p className="text-[10px] text-white/15">
                  Drop or click · max {maxLabel(assetType)}
                </p>
              </>
            )}
          </div>

          {uploadError && (
            <p className="text-[10px] text-red-400">{uploadError}</p>
          )}

          {/* Library toggle */}
          <button
            type="button"
            onClick={() => setShowLibrary((v) => !v)}
            className="text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors"
          >
            {showLibrary ? "▲ Hide library" : "▼ Attach from library"}
          </button>
        </div>
      )}

      {/* Read-only state (no upload permission) */}
      {!canUpload && attached.length === 0 && (
        <p className="text-[10px] text-white/20 italic">No {assetType} attached.</p>
      )}

      {/* Library picker */}
      {showLibrary && canUpload && (
        <LibraryPicker
          assetType={assetType}
          onPick={handleLibraryPick}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}
