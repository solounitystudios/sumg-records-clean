import Link from "next/link"
import { getHomepageConfig } from "@/lib/db/homepage"
import { getArtists } from "@/lib/db/artists"
import { getReleases } from "@/lib/db/releases"
import { getBrands } from "@/lib/db/brands"
import { getNews } from "@/lib/db/news"
import { getProducers } from "@/lib/db/producers"
import { getLyricProjects } from "@/lib/db/lyrics"

export const metadata = { title: "CMS Control Center — SUMG Admin" }

const SEO_PAGES = [
  { path: "/",              title: "SUMG Records — Modern Music Label, Creator Platform & Artist Ecosystem" },
  { path: "/artists",       title: "Artists — SUMG Records" },
  { path: "/releases",      title: "Releases — SUMG Records" },
  { path: "/producers",     title: "Producers — SUMG Records" },
  { path: "/brands",        title: "Brands — SUMG Records" },
  { path: "/news",          title: "News — SUMG Records" },
  { path: "/songs",         title: "Songs — SUMG Records" },
  { path: "/about",         title: "About — SUMG Records" },
  { path: "/contact",       title: "Contact — SUMG Records" },
  { path: "/membership",    title: "Membership — SUMG Records" },
]

export default async function CmsPage() {
  const [config, artists, releases, brands, news, producers, lyricProjects] = await Promise.all([
    getHomepageConfig(),
    getArtists(),
    getReleases(),
    getBrands(),
    getNews(),
    getProducers(),
    getLyricProjects(),
  ])

  const liveReleases   = releases.filter((r) => r.status === "live")
  const draftReleases  = releases.filter((r) => r.status === "draft")
  const featuredNews   = news.filter((n) => n.featured)
  const visibleSections = config.sectionVisibility
    ? Object.entries(config.sectionVisibility)
        .filter(([, v]) => v)
        .map(([k]) => k)
    : []

  const contentAreas = [
    {
      label: "Artist Pages",
      href: "/admin/artists",
      count: artists.length,
      meta: `${artists.length} on roster`,
      action: "Manage Artists",
    },
    {
      label: "Releases",
      href: "/admin/releases",
      count: releases.length,
      meta: `${liveReleases.length} live · ${draftReleases.length} draft`,
      action: "Manage Releases",
    },
    {
      label: "Brands",
      href: "/admin/brands",
      count: brands.length,
      meta: `${brands.filter((b) => b.isActive).length} active`,
      action: "Manage Brands",
    },
    {
      label: "News",
      href: "/admin/news",
      count: news.length,
      meta: `${featuredNews.length} featured`,
      action: "Manage News",
    },
    {
      label: "Songs",
      href: "/admin/lyrics",
      count: lyricProjects.length,
      meta: "lyric projects",
      action: "Manage Songs",
    },
    {
      label: "Producers",
      href: "/admin/producers",
      count: producers.length,
      meta: "in network",
      action: "Manage Producers",
    },
  ]

  return (
    <main className="px-6 py-10 md:px-10 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Website</p>
        <h1 className="text-3xl font-semibold">CMS Control Center</h1>
        <p className="mt-2 text-sm text-white/50">
          Edit and publish all public-facing content from one place.
        </p>
      </div>

      {/* ── Homepage Config ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Homepage</h2>
          <Link
            href="/admin/cms/homepage"
            className="text-xs text-white/40 hover:text-white transition-colors duration-150"
          >
            Edit Homepage →
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-white/25 mb-2">Hero Headline</p>
              <p className="text-lg font-semibold leading-tight">{config.heroHeadline}</p>
              <p className="mt-2 text-sm text-white/45 leading-relaxed max-w-xl">
                {config.heroSubtext}
              </p>
            </div>

            <div className="space-y-4 lg:text-right lg:shrink-0">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-white/25 mb-1.5">Featured</p>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {[
                    { label: `${config.featuredArtistSlugs.length} artists`, color: "bg-sky-500/15 text-sky-400" },
                    { label: `${(config.featuredBrandSlugs ?? []).length} brands`, color: "bg-violet-500/15 text-violet-400" },
                    { label: `${(config.featuredReleaseSlugs ?? []).length} releases`, color: "bg-emerald-500/15 text-emerald-400" },
                  ].map(({ label, color }) => (
                    <span key={label} className={`text-xs px-2.5 py-0.5 rounded-full ${color}`}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-white/25 mb-1.5">
                  Visible Sections
                </p>
                <div className="flex flex-wrap gap-1.5 lg:justify-end">
                  {["hero", "artists", "releases", "brands", "producers"].map((s) => {
                    const on = visibleSections.includes(s)
                    return (
                      <span
                        key={s}
                        className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                          on
                            ? "bg-white/10 text-white/60"
                            : "bg-white/[0.03] text-white/20 line-through"
                        }`}
                      >
                        {s}
                      </span>
                    )
                  })}
                </div>
              </div>

              {config.showLatestReleases && (
                <p className="text-xs text-white/30">
                  Showing {config.latestReleasesCount} latest releases
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Areas ── */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Content Areas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contentAreas.map((area) => (
            <Link
              key={area.href}
              href={area.href}
              className="group rounded-2xl border border-white/10 bg-[#0d1016] p-5 hover:border-white/20 hover:bg-white/[0.04] transition-colors duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs uppercase tracking-[0.15em] text-white/35">{area.label}</p>
                <span className="text-white/20 group-hover:text-white/50 transition-colors text-xs">→</span>
              </div>
              <div className="text-3xl font-semibold mb-1">{area.count}</div>
              <p className="text-xs text-white/30">{area.meta}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.15em] text-white/20 group-hover:text-white/40 transition-colors duration-150">
                {area.action}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── SEO & Metadata ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">SEO &amp; Metadata</h2>
          <span className="text-[10px] text-white/20 uppercase tracking-[0.15em]">
            Managed in source code
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05] grid grid-cols-[180px_1fr] gap-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">Page</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">Title Tag</span>
          </div>
          {SEO_PAGES.map((page, i) => (
            <div
              key={page.path}
              className={`px-5 py-3 grid grid-cols-[180px_1fr] gap-4 items-start ${
                i < SEO_PAGES.length - 1 ? "border-b border-white/[0.04]" : ""
              }`}
            >
              <span className="text-xs font-mono text-white/40">{page.path}</span>
              <span className="text-xs text-white/55 leading-relaxed">{page.title}</span>
            </div>
          ))}
          <div className="px-5 py-4 border-t border-white/[0.05] bg-white/[0.02]">
            <p className="text-xs text-white/30">
              Page titles and Open Graph metadata live in each page&apos;s{" "}
              <code className="text-white/45 font-mono text-[11px]">metadata</code> export.
              Dynamic pages (artists, releases, brands) generate titles from their content.
            </p>
          </div>
        </div>
      </section>

      {/* ── Media & Assets ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Media &amp; Assets</h2>
        </div>

        <div className="rounded-2xl border border-white/[0.07] border-dashed bg-white/[0.01] p-8 text-center">
          <p className="text-sm text-white/30 mb-1">Asset library</p>
          <p className="text-xs text-white/20 max-w-sm mx-auto leading-relaxed">
            Centralized media upload, tagging, and attachment to artists, releases, and brands.
            Available in a future release.
          </p>
        </div>
      </section>
    </main>
  )
}
