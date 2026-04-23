import { requireAdmin } from "@/lib/auth"
import { getAssets, formatBytes } from "@/lib/db/assets"
import type { AssetType } from "@/lib/types"
import { AssetUploader } from "./AssetUploader"
import Link from "next/link"

const TYPE_TABS: { label: string; value: AssetType | "all" }[] = [
  { label: "All",       value: "all" },
  { label: "Images",    value: "image" },
  { label: "Audio",     value: "audio" },
  { label: "Documents", value: "document" },
]

const TYPE_ICON: Record<string, string> = {
  image:    "▣",
  audio:    "♫",
  document: "▤",
  video:    "▶",
}

function AssetCard({ asset }: { asset: Awaited<ReturnType<typeof getAssets>>[number] }) {
  const isImage = asset.type === "image"
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden group">
      {/* Preview */}
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

      {/* Info */}
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

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  await requireAdmin()
  const { type } = await searchParams

  const validTypes: AssetType[] = ["image", "audio", "document", "video"]
  const activeType = validTypes.includes(type as AssetType) ? (type as AssetType) : undefined

  const assets = await getAssets(activeType)

  const counts = {
    all:      assets.length,
    image:    assets.filter(a => a.type === "image").length,
    audio:    assets.filter(a => a.type === "audio").length,
    document: assets.filter(a => a.type === "document").length,
  }

  const totalSize = assets.reduce((s, a) => s + (a.size_bytes ?? 0), 0)

  return (
    <div className="px-6 py-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Assets</h1>
          <p className="text-xs text-white/35 mt-1">
            {assets.length} files · {formatBytes(totalSize)} total
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <div className="mb-8">
        <AssetUploader />
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-1 mb-6">
        {TYPE_TABS.map(tab => {
          const isActive = (tab.value === "all" && !activeType) || tab.value === activeType
          const count = tab.value === "all" ? assets.length : counts[tab.value as keyof typeof counts] ?? 0
          return (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/admin/assets" : `/admin/assets?type=${tab.value}`}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[9px] tabular-nums opacity-60">{count}</span>
            </Link>
          )
        })}
      </div>

      {/* Grid */}
      {assets.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-6 py-10 text-center">
          <p className="text-sm text-white/30">No assets yet. Upload your first file above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {assets.map(asset => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* Architecture note */}
      <div className="mt-10 border-t border-white/[0.05] pt-6">
        <p className="text-[10px] text-white/20 uppercase tracking-wide mb-2">Asset Picker</p>
        <p className="text-xs text-white/25">
          Assets uploaded here are available in the artist, release, and song editors.
          Copy a URL and paste it into any image or media field, or use the inline picker when editing an entity.
        </p>
      </div>

    </div>
  )
}
