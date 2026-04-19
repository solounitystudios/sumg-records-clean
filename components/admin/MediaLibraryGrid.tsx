"use client";

import { useState } from "react";
import { CMSAsset, AssetType } from "@/lib/types";
import { useCmsStore } from "@/lib/cms/store";

const TYPE_ICONS: Record<AssetType | "document", string> = {
  image: "▣",
  video: "▶",
  audio: "♫",
  document: "▤",
};

interface MediaLibraryGridProps {
  onSelect?: (asset: CMSAsset) => void;
  selectedId?: string;
  filterType?: AssetType;
}

export function MediaLibraryGrid({
  onSelect,
  selectedId,
  filterType,
}: MediaLibraryGridProps) {
  const { assets, deleteAsset, updateAsset, notify } = useCmsStore();

  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<AssetType | "all">(
    filterType ?? "all"
  );
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = assets.filter((a) => {
    if (activeType !== "all" && a.type !== activeType) return false;
    if (
      search &&
      !a.filename.toLowerCase().includes(search.toLowerCase()) &&
      !(a.altText?.toLowerCase().includes(search.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });

  const detailAsset = detailId ? assets.find((a) => a.id === detailId) : null;

  function handleDelete(id: string) {
    deleteAsset(id);
    if (detailId === id) setDetailId(null);
    notify("success", "Asset deleted.");
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => notify("info", "URL copied."));
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Type filter tabs */}
        <div className="flex items-center gap-1">
          {(["all", "image", "video", "audio"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveType(t)}
              className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase transition-colors border ${
                activeType === t
                  ? "border-white/20 text-white bg-white/[0.06]"
                  : "border-white/5 text-white/30 hover:text-white/60 hover:border-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets…"
          className="flex-1 min-w-40 bg-transparent border border-white/10 px-3 py-1.5 text-xs text-white placeholder-white/20 focus:border-white/25 focus:outline-none"
        />

        <p className="text-[10px] text-white/20 ml-auto">
          {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="border border-white/5 p-12 text-center">
          <p className="text-xs text-white/20 italic">
            {assets.length === 0
              ? "No assets uploaded yet. Use the upload section above."
              : "No assets match your filter."}
          </p>
        </div>
      )}

      {/* Grid + detail panel */}
      <div className="flex gap-4">
        {/* Grid */}
        <div
          className={`grid gap-2 flex-1 ${
            detailAsset ? "grid-cols-3 xl:grid-cols-4" : "grid-cols-4 xl:grid-cols-6"
          }`}
        >
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              selected={selectedId === asset.id || detailId === asset.id}
              onSelect={() => {
                setDetailId(asset.id);
                onSelect?.(asset);
              }}
              onDelete={handleDelete}
              onCopyUrl={copyUrl}
            />
          ))}
        </div>

        {/* Detail panel */}
        {detailAsset && (
          <AssetDetailPanel
            asset={detailAsset}
            onClose={() => setDetailId(null)}
            onDelete={handleDelete}
            onCopyUrl={copyUrl}
            onUpdateAltText={(val) => updateAsset(detailAsset.id, { altText: val })}
          />
        )}
      </div>
    </div>
  );
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

interface AssetCardProps {
  asset: CMSAsset;
  selected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onCopyUrl: (url: string) => void;
}

function AssetCard({ asset, selected, onSelect, onDelete, onCopyUrl }: AssetCardProps) {
  return (
    <div
      className={`group relative border cursor-pointer transition-all duration-150 ${
        selected
          ? "border-white/30 bg-white/[0.05]"
          : "border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02]"
      }`}
      onClick={onSelect}
    >
      {/* Preview area */}
      <div className="aspect-square flex items-center justify-center bg-white/[0.02] overflow-hidden">
        {asset.type === "image" && asset.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.url}
            alt={asset.altText ?? asset.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl text-white/20">
            {TYPE_ICONS[asset.type]}
          </span>
        )}
      </div>

      {/* Filename */}
      <div className="p-2">
        <p className="text-[10px] text-white/40 truncate leading-tight">
          {asset.filename}
        </p>
        <p className="text-[9px] text-white/15 uppercase tracking-wider mt-0.5">
          {asset.type}
        </p>
      </div>

      {/* Hover actions */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCopyUrl(asset.url); }}
          title="Copy URL"
          className="w-6 h-6 flex items-center justify-center bg-black/60 text-white/50 hover:text-white text-[10px]"
        >
          ⎘
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
          title="Delete"
          className="w-6 h-6 flex items-center justify-center bg-black/60 text-red-900 hover:text-red-400 text-[10px]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Asset Detail Panel ───────────────────────────────────────────────────────

interface AssetDetailPanelProps {
  asset: CMSAsset;
  onClose: () => void;
  onDelete: (id: string) => void;
  onCopyUrl: (url: string) => void;
  onUpdateAltText: (val: string) => void;
}

function AssetDetailPanel({
  asset,
  onClose,
  onDelete,
  onCopyUrl,
  onUpdateAltText,
}: AssetDetailPanelProps) {
  const [altText, setAltText] = useState(asset.altText ?? "");

  return (
    <div className="w-64 flex-shrink-0 border border-white/8 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
          Asset Detail
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-white/25 hover:text-white text-xs transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Preview */}
      <div className="aspect-square flex items-center justify-center bg-white/[0.02] border border-white/5 overflow-hidden">
        {asset.type === "image" && asset.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.url}
            alt={asset.altText ?? asset.filename}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-4xl text-white/20">{TYPE_ICONS[asset.type]}</span>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-2 text-xs">
        <div>
          <p className="text-[9px] tracking-wider uppercase text-white/20">Filename</p>
          <p className="text-white/50 truncate mt-0.5">{asset.filename}</p>
        </div>
        <div>
          <p className="text-[9px] tracking-wider uppercase text-white/20">Type</p>
          <p className="text-white/50 capitalize mt-0.5">{asset.type}</p>
        </div>
        {asset.sizeBytes && (
          <div>
            <p className="text-[9px] tracking-wider uppercase text-white/20">Size</p>
            <p className="text-white/50 mt-0.5">
              {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
        <div>
          <p className="text-[9px] tracking-wider uppercase text-white/20">Uploaded</p>
          <p className="text-white/50 mt-0.5">
            {new Date(asset.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Alt text */}
      <div>
        <p className="text-[9px] tracking-wider uppercase text-white/20 mb-1.5">
          Alt Text
        </p>
        <textarea
          rows={2}
          value={altText}
          onChange={(e) => {
            setAltText(e.target.value);
            onUpdateAltText(e.target.value);
          }}
          placeholder="Describe this asset…"
          className="w-full bg-transparent border border-white/10 px-3 py-2 text-xs text-white placeholder-white/20 focus:border-white/25 focus:outline-none resize-none"
        />
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <button
          type="button"
          onClick={() => onCopyUrl(asset.url)}
          className="w-full text-[10px] tracking-[0.15em] uppercase border border-white/10 py-2 text-white/40 hover:text-white hover:border-white/25 transition-colors"
        >
          Copy URL
        </button>
        <button
          type="button"
          onClick={() => onDelete(asset.id)}
          className="w-full text-[10px] tracking-[0.15em] uppercase border border-red-900/40 py-2 text-red-900 hover:text-red-400 hover:border-red-500/40 transition-colors"
        >
          Delete Asset
        </button>
      </div>
    </div>
  );
}
