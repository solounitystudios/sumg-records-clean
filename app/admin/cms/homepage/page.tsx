import Link from "next/link"
import { getHomepageConfig } from "@/lib/db/homepage"
import { getArtists } from "@/lib/db/artists"
import { getReleases } from "@/lib/db/releases"
import { getBrands } from "@/lib/db/brands"
import { updateHomepageConfig } from "@/app/actions/homepage"

export const dynamic = "force-dynamic"
export const metadata = { title: "Edit Homepage — SUMG Admin" }

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

const SECTIONS = [
  { key: "hero",      label: "Hero Banner" },
  { key: "artists",   label: "Featured Artists" },
  { key: "releases",  label: "Latest Releases" },
  { key: "brands",    label: "Brand Worlds" },
  { key: "producers", label: "Producer Network" },
] as const

export default async function EditHomepagePage() {
  const [config, artists, releases, brands] = await Promise.all([
    getHomepageConfig(),
    getArtists(),
    getReleases(),
    getBrands(),
  ])

  const liveReleases = releases.filter((r) => r.status === "published")

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Link href="/admin/cms" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            CMS
          </Link>
          <span className="text-white/15">/</span>
          <span className="text-xs text-white/50">Homepage</span>
        </div>
        <h1 className="text-3xl font-semibold">Edit Homepage</h1>
        <p className="mt-2 text-sm text-white/50">
          Configure the hero copy, featured content, and section visibility.
        </p>
      </div>

      <form action={updateHomepageConfig} className="space-y-8">

        {/* ── Hero Copy ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 space-y-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Hero Copy</h2>

          <div>
            <label htmlFor="heroHeadline" className={labelClass}>Headline</label>
            <input
              id="heroHeadline"
              name="heroHeadline"
              type="text"
              required
              defaultValue={config.heroHeadline}
              placeholder="Sound. Vision. Culture."
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-white/25">
              Displays as the large stacked headline on the homepage.
            </p>
          </div>

          <div>
            <label htmlFor="heroSubtext" className={labelClass}>Subtext</label>
            <textarea
              id="heroSubtext"
              name="heroSubtext"
              rows={3}
              required
              defaultValue={config.heroSubtext}
              placeholder="SUMG Records is an independent label..."
              className={`${inputClass} resize-none`}
            />
            <p className="mt-1.5 text-xs text-white/25">
              One or two sentences. Appears below the headline.
            </p>
          </div>
        </div>

        {/* ── Featured Artists ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Featured Artists</h2>
          <p className="text-xs text-white/30 mb-4">
            Select artists to feature in the homepage artists section.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {artists.map((artist) => (
              <label
                key={artist.slug}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  name="featuredArtistSlugs"
                  value={artist.slug}
                  defaultChecked={config.featuredArtistSlugs.includes(artist.slug)}
                  className="accent-white"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{artist.name}</p>
                  <p className="text-xs text-white/35 truncate">{artist.role}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Featured Releases ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Featured Releases</h2>
          <p className="text-xs text-white/30 mb-4">
            Select live releases to highlight. Shown in the releases section.
          </p>
          <div className="space-y-2">
            {liveReleases.map((release) => (
              <label
                key={release.slug}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  name="featuredReleaseSlugs"
                  value={release.slug}
                  defaultChecked={(config.featuredReleaseSlugs ?? []).includes(release.slug)}
                  className="accent-white"
                />
                <div
                  className="shrink-0 w-7 h-7 rounded-lg"
                  style={{
                    background: `${release.accentColor}22`,
                    border: `1px solid ${release.accentColor}44`,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{release.title}</p>
                  <p className="text-xs text-white/35 truncate">{release.artistName}</p>
                </div>
              </label>
            ))}
            {liveReleases.length === 0 && (
              <p className="text-xs text-white/30 px-1">
                No live releases. Publish a release first.
              </p>
            )}
          </div>
        </div>

        {/* ── Featured Brands ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Featured Brands</h2>
          <p className="text-xs text-white/30 mb-4">Select brands to feature in the Brand Worlds section.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {brands.map((brand) => (
              <label
                key={brand.slug}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  name="featuredBrandSlugs"
                  value={brand.slug}
                  defaultChecked={(config.featuredBrandSlugs ?? []).includes(brand.slug)}
                  className="accent-white"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{brand.name}</p>
                  <p className="text-xs text-white/35 truncate">{brand.tagline}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Latest Releases Toggle ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Latest Releases Strip</h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="showLatestReleases"
              defaultChecked={config.showLatestReleases}
              className="accent-white"
            />
            <span className="text-sm text-white/70">Show latest releases strip on homepage</span>
          </label>

          <div>
            <label htmlFor="latestReleasesCount" className={labelClass}>
              Number of releases to show
            </label>
            <input
              id="latestReleasesCount"
              name="latestReleasesCount"
              type="number"
              min={1}
              max={12}
              defaultValue={config.latestReleasesCount}
              className={`${inputClass} w-24`}
            />
          </div>
        </div>

        {/* ── Section Visibility ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Section Visibility</h2>
          <p className="text-xs text-white/30 mb-4">Toggle which sections appear on the homepage.</p>
          <div className="space-y-3">
            {SECTIONS.map(({ key, label }) => {
              const visible = config.sectionVisibility?.[key] ?? true
              return (
                <label
                  key={key}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <span className="text-sm text-white/70">{label}</span>
                  <input
                    type="checkbox"
                    name={`section_${key}`}
                    defaultChecked={visible}
                    className="accent-white"
                  />
                </label>
              )
            })}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-8 py-3 text-sm font-medium text-black hover:bg-white/90 transition-colors duration-150"
          >
            Save Homepage
          </button>
          <Link
            href="/admin/cms"
            className="text-sm text-white/40 hover:text-white/70 transition-colors duration-150"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
