"use client"

import type { AssetRow } from "@/lib/db/assets"

const TYPE_ICON: Record<string, string> = {
  image:    "▣",
  audio:    "♫",
  document: "▤",
  video:    "▶",
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AssetCard({ asset }: { asset: AssetRow }) {
  const isImage = asset.type === "image"
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden group">
      <div className="aspect-square bg-white/[0.03] flex items-center justify-center overflow-hidden">
        {isImage ? (
          <img
            src={asset.url}
            alt={asset.alt_text ?? asset.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-3xl text-white/15">{TYPE_ICON[asset.type] ?? "▤"}</span>
        )}
      </div>

      <div className="px-3 py-2.5">
        <p className="text-xs font-medium truncate text-white/70" title={asset.filename}>
          {asset.filename}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-white/25 uppercase tracking-wide">{asset.type}</span>
          <span className="text-[9px] text-white/25 tabular-nums">{formatBytes(asset.size_bytes)}</span>
        </div>
        <div className="mt-2 flex gap-2">
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-white/30 hover:text-white/60 transition-colors"
          >
            Open ↗
          </a>
          <button
            className="text-[9px] text-white/20 hover:text-white/40 transition-colors"
            onClick={async () => {
              await navigator.clipboard.writeText(asset.url)
            }}
          >
            Copy URL
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  assets: AssetRow[]
}

export function AssetsClient({ assets }: Props) {
  if (assets.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-6 py-10 text-center">
        <p className="text-sm text-white/30">No assets yet. Upload your first file above.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {assets.map(asset => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  )
}
