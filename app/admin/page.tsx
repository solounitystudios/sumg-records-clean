import Link from "next/link"
import { formatRevenue } from "@/lib/data"
import { getArtists } from "@/lib/db/artists"
import { getReleases } from "@/lib/db/releases"
import { getRoyalties } from "@/lib/db/royalties"

export const metadata = { title: "Admin Dashboard — SUMG Records" }

const STATUS_CLS: Record<string, string> = {
  active:   "bg-emerald-500/15 text-emerald-400",
  draft:    "bg-white/8 text-white/35",
  archived: "bg-red-500/10 text-red-400/60",
}

// Returns the most recent quarter label that has royalty data, or the current quarter.
function latestPeriodWithRevenue(royalties: { period: string }[]): string {
  const periods = [...new Set(royalties.map((r) => r.period))].sort().reverse()
  return periods[0] ?? currentQuarterLabel()
}

function currentQuarterLabel(): string {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}-Q${q}`
}

export default async function AdminPage() {
  const [artists, releases, royalties] = await Promise.all([getArtists(), getReleases(), getRoyalties()])

  const activeArtists   = artists.filter((a) => !a.status || a.status === "active").length
  const archivedArtists = artists.filter((a) => a.status === "archived").length
  const liveReleases    = releases.filter((r) => r.status === "published").length
  const draftReleases   = releases.filter((r) => r.status === "draft").length

  const period        = latestPeriodWithRevenue(royalties)
  const periodRevenue = royalties
    .filter((r) => r.period === period)
    .reduce((s, r) => s + r.revenue, 0)

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Overview</h1>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        {[
          { label: "Active Artists",   value: activeArtists.toString(),   sub: archivedArtists > 0 ? `${archivedArtists} archived` : "on roster" },
          { label: "Published Releases", value: liveReleases.toString(),    sub: `${draftReleases} in draft` },
          { label: `${period} Revenue`,  value: formatRevenue(periodRevenue), sub: "Latest period" },
          { label: "Total Releases",     value: releases.length.toString(), sub: `${liveReleases} published` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-3">{label}</div>
            <div className="text-3xl font-semibold">{value}</div>
            <div className="mt-1 text-xs text-white/35">{sub}</div>
          </div>
        ))}
      </div>

      {/* Artists + Recent Releases */}
      <div className="grid gap-6 lg:grid-cols-2 mb-10">
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium">Artists</h2>
            <Link href="/admin/artists" className="text-xs text-white/40 hover:text-white transition">
              Manage →
            </Link>
          </div>
          <div className="space-y-3">
            {artists.map((artist) => (
              <div key={artist.slug} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{artist.name}</div>
                  <div className="text-xs text-white/35">{artist.role} · {artist.genre}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLS[artist.status ?? "active"] ?? STATUS_CLS.active}`}>
                  {artist.status ?? "active"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium">Recent Releases</h2>
            <Link href="/admin/releases" className="text-xs text-white/40 hover:text-white transition">
              Command Center →
            </Link>
          </div>
          <div className="space-y-3">
            {releases.slice(0, 5).map((release) => (
              <div key={release.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="shrink-0 w-7 h-7 rounded-lg"
                    style={{
                      background: `${release.accentColor}22`,
                      border: `1px solid ${release.accentColor}44`,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{release.title}</div>
                    <div className="text-xs text-white/35">{release.artistName}</div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    release.status === "published"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : release.status === "scheduled"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-white/8 text-white/35"
                  }`}
                >
                  {release.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick nav grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/admin/royalties",       label: "Royalty Platform",        desc: "Revenue, streams, platform breakdown" },
          { href: "/admin/releases",        label: "Release Command Center",   desc: "Manage all releases and rollouts" },
          { href: "/admin/artists",         label: "Artist Management",        desc: "Roster, bios, and stats" },
          { href: "/admin/producers",       label: "Producer Network",         desc: "Manage producers and credits" },
          { href: "/admin/brands",          label: "Brand System",             desc: "Fashion brands and identity" },
          { href: "/admin/songs",           label: "Song Catalog",             desc: "All tracks, ISRC, rights coverage" },
          { href: "/admin/youtube/command", label: "YouTube Command Panel",    desc: "Queue health, job pipeline, channels" },
          { href: "/admin/youtube/inbox",   label: "Audio Inbox",              desc: "Incoming audio, producer routing" },
          { href: "/admin/dna/builder",     label: "DNA Builder",              desc: "Artist × producer variation engine" },
          { href: "/admin/finance",         label: "Finance",                  desc: "Income, expenses, label cash flow" },
          { href: "/admin/rights",          label: "Rights & Publishing",      desc: "ISRC, PRO, distribution records" },
          { href: "/admin/news",            label: "News",                     desc: "Label news and announcements" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/8 transition"
          >
            <h3 className="text-sm font-medium mb-1">{item.label}</h3>
            <p className="text-xs text-white/40">{item.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
