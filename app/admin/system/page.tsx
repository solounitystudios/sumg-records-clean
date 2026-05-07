import Link from "next/link"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import { getPublicProducts } from "@/lib/shopify/server"

export const dynamic = "force-dynamic"
export const metadata = { title: "System Map — SUMG Admin" }

interface SystemEntity {
  key: string
  label: string
  group: "Media" | "Jobs" | "Commerce" | "Catalog" | "Rights"
  href: string
  count: number | null
  detail?: string
  source: string
}

async function safeCount(
  table: string,
  filter?: { col: string; not?: string; inList?: string[] },
): Promise<number | null> {
  try {
    let q = supabase.from(table).select("id", { count: "exact", head: true })
    if (filter?.inList) q = q.in(filter.col, filter.inList)
    if (filter?.not !== undefined) q = q.neq(filter.col, filter.not)
    const { count, error } = await q
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}

async function safeShopifyCount(): Promise<{ count: number | null; usingFallback: boolean }> {
  try {
    const products = await getPublicProducts()
    return { count: products.length, usingFallback: false }
  } catch {
    return { count: null, usingFallback: true }
  }
}

async function getEntities(): Promise<SystemEntity[]> {
  const [
    assetsCount,
    thumbJobsCount,
    thumbJobsPending,
    uploadJobsCount,
    uploadJobsActive,
    renderJobsActive,
    queuePending,
    songsCount,
    releasesCount,
    artistsCount,
    rightsCount,
    royaltiesCount,
    shopify,
  ] = await Promise.all([
    safeCount("assets"),
    safeCount("thumbnail_generation_jobs"),
    safeCount("thumbnail_generation_jobs", { col: "status", inList: ["pending", "processing"] }),
    safeCount("yt_upload_jobs"),
    safeCount("yt_upload_jobs", { col: "status", inList: ["pending", "processing", "scheduled"] }),
    safeCount("yt_upload_jobs", { col: "status", inList: ["needs_render", "rendering"] }),
    safeCount("yt_upload_jobs", { col: "status", inList: ["needs_asset", "needs_render", "pending", "scheduled"] }),
    safeCount("songs", { col: "status", not: "archived" }),
    safeCount("releases"),
    safeCount("artists", { col: "status", not: "archived" }),
    safeCount("publishing_works"),
    safeCount("royalties"),
    safeShopifyCount(),
  ])

  return [
    {
      key: "assets",
      label: "Assets",
      group: "Media",
      href: "/admin/assets",
      count: assetsCount,
      detail: "Audio, images, and source files",
      source: "assets",
    },
    {
      key: "thumb-jobs",
      label: "Thumbnail Jobs",
      group: "Jobs",
      href: "/admin/youtube/thumbnail-studio",
      count: thumbJobsCount,
      detail: thumbJobsPending != null ? `${thumbJobsPending} pending or processing` : undefined,
      source: "thumbnail_generation_jobs",
    },
    {
      key: "upload-jobs",
      label: "Upload Jobs",
      group: "Jobs",
      href: "/admin/youtube/jobs",
      count: uploadJobsCount,
      detail: uploadJobsActive != null ? `${uploadJobsActive} active` : undefined,
      source: "yt_upload_jobs",
    },
    {
      key: "render-jobs",
      label: "Render Jobs",
      group: "Jobs",
      href: "/admin/youtube/render",
      count: renderJobsActive,
      detail: "Status: needs_render, rendering",
      source: "yt_upload_jobs",
    },
    {
      key: "yt-queue",
      label: "YouTube Queue",
      group: "Jobs",
      href: "/admin/youtube/queue",
      count: queuePending,
      detail: "Awaiting asset, render, or scheduled slot",
      source: "yt_upload_jobs",
    },
    {
      key: "shopify",
      label: "Shopify Products",
      group: "Commerce",
      href: "/admin/storefront",
      count: shopify.count,
      detail: shopify.usingFallback ? "Storefront not configured · using fallback" : "Live from Storefront API",
      source: "shopify",
    },
    {
      key: "songs",
      label: "Songs",
      group: "Catalog",
      href: "/admin/songs",
      count: songsCount,
      detail: "Excludes archived",
      source: "songs",
    },
    {
      key: "releases",
      label: "Releases",
      group: "Catalog",
      href: "/admin/releases",
      count: releasesCount,
      source: "releases",
    },
    {
      key: "artists",
      label: "Artists",
      group: "Catalog",
      href: "/admin/artists",
      count: artistsCount,
      detail: "Excludes archived",
      source: "artists",
    },
    {
      key: "rights",
      label: "Rights",
      group: "Rights",
      href: "/admin/rights",
      count: rightsCount,
      detail: "Publishing works",
      source: "publishing_works",
    },
    {
      key: "royalties",
      label: "Royalties",
      group: "Rights",
      href: "/admin/royalties",
      count: royaltiesCount,
      detail: "Period × artist rows",
      source: "royalties",
    },
  ]
}

const GROUP_ORDER: SystemEntity["group"][] = ["Media", "Jobs", "Commerce", "Catalog", "Rights"]

export default async function SystemPage() {
  await requireAdmin()
  const entities = await getEntities()

  const totalReachable = entities.filter((e) => e.count !== null).length
  const totalRecords = entities.reduce((s, e) => s + (e.count ?? 0), 0)

  return (
    <main className="px-6 py-10 md:px-10 max-w-5xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / System</p>
          <h1 className="text-3xl font-semibold tracking-tight">System Map</h1>
          <p className="mt-2 text-sm text-white/40">
            {totalReachable} of {entities.length} sources reachable · {totalRecords.toLocaleString()} total records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/queues" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">Queues →</Link>
          <Link href="/admin/settings" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">Settings →</Link>
        </div>
      </div>

      <div className="space-y-8">
        {GROUP_ORDER.map((group) => {
          const items = entities.filter((e) => e.group === group)
          if (items.length === 0) return null
          return (
            <section key={group}>
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/25 font-mono mb-3">{group}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((entity) => (
                  <Link
                    key={entity.key}
                    href={entity.href}
                    className="group rounded-2xl border border-white/[0.07] bg-[#0d1016] hover:border-white/[0.13] hover:bg-white/[0.03] transition-colors duration-150 p-5 flex flex-col gap-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-white/85 group-hover:text-white">{entity.label}</span>
                      <span className={`text-2xl font-semibold tabular-nums font-mono ${entity.count === null ? "text-white/15" : "text-white/85"}`}>
                        {entity.count === null ? "—" : entity.count.toLocaleString()}
                      </span>
                    </div>
                    {entity.detail && <p className="text-[11px] text-white/40 leading-relaxed">{entity.detail}</p>}
                    <p className="text-[10px] font-mono text-white/20 mt-auto pt-1">
                      {entity.source}
                      {entity.count === null && <span className="text-amber-400/60"> · unreachable</span>}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <p className="text-[10px] text-white/20 font-mono mt-10">
        Counts use Supabase{" "}
        <code className="text-white/30">head: true</code> queries. Cells showing &mdash; mean the table or service is unreachable from this environment.
      </p>
    </main>
  )
}
