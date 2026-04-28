import { requireAdmin } from "@/lib/auth"
import { getAssets, formatBytes } from "@/lib/db/assets"
import { getProducers } from "@/lib/db/producers"
import { AssetUploader } from "./AssetUploader"
import { AssetsClient } from "@/components/admin/assets/AssetsClient"

export const metadata = { title: "Assets — SUMG Admin" }

export default async function AssetsPage() {
  await requireAdmin()

  const [assets, producers] = await Promise.all([getAssets(), getProducers()])
  const totalSize = assets.reduce((s, a) => s + (a.size_bytes ?? 0), 0)

  return (
    <div className="px-4 sm:px-6 py-8 max-w-7xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Assets</h1>
          <p className="text-xs text-white/35 mt-1">
            {assets.length} files · {formatBytes(totalSize)} total
          </p>
        </div>
      </div>

      {/* Upload */}
      <div className="mb-8">
        <AssetUploader />
      </div>

      {/* Full asset manager (filters, grid/table, bulk actions) */}
      <AssetsClient
        assets={assets}
        producers={producers.map((p) => ({ slug: p.slug, name: p.name }))}
      />

      {/* Footer note */}
      <div className="mt-10 border-t border-white/[0.05] pt-6">
        <p className="text-[10px] text-white/20 uppercase tracking-wide mb-2">Asset Picker</p>
        <p className="text-xs text-white/25">
          Assets uploaded here are available in the artist, release, and song editors.
          Copy a URL and paste it into any image or media field.
        </p>
      </div>

    </div>
  )
}
