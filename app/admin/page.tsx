import Link from "next/link"
import { formatRevenue } from "@/lib/data"
import { getArtists } from "@/lib/db/artists"
import { getReleases } from "@/lib/db/releases"
import { getRoyalties } from "@/lib/db/royalties"

export const metadata = { title: "Command Center — SUMG Records" }

const STATUS_CLS: Record<string, string> = {
  active:   "bg-emerald-500/15 text-emerald-400",
  draft:    "bg-white/8 text-white/35",
  archived: "bg-red-500/10 text-red-400/60",
}

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
  const scheduledReleases = releases.filter((r) => r.status === "scheduled").length

  const period        = latestPeriodWithRevenue(royalties)
  const periodRevenue = royalties
    .filter((r) => r.period === period)
    .reduce((s, r) => s + r.revenue, 0)

  const now = new Date()
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })

  return (
    <main className="px-6 py-10 md:px-10">

      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">
            SUMG Records / Admin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Command Center</h1>
          <p className="mt-2 text-sm text-white/40">
            Roster · Catalog · Revenue · Operations
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.15em] text-emerald-400/80">
              LIVE {timeStr}
            </span>
          </span>
        </div>
      </div>

      {/* KPI row — all clickable */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        <Link
          href="/admin/artists?status=active"
          className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-6 hover:border-white/20 hover:from-white/[0.07] transition-all duration-150"
        >
          <div className="absolute inset-y-0 left-0 w-[2px] rounded-l-2xl bg-emerald-500/50 group-hover:bg-emerald-400/70 transition-colors duration-150" />
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-3 font-mono">Active Artists</div>
          <div className="text-3xl font-semibold tabular-nums font-mono">{activeArtists}</div>
          <div className="mt-1.5 text-[10px] text-white/30 font-mono">
            {archivedArtists > 0 ? `+${archivedArtists} archived` : "on roster"}
          </div>
          <div className="absolute bottom-3 right-4 text-[9px] text-white/15 group-hover:text-white/30 transition-colors duration-150 tracking-widest">VIEW →</div>
        </Link>

        <Link
          href="/admin/releases?status=published"
          className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-6 hover:border-white/20 hover:from-white/[0.07] transition-all duration-150"
        >
          <div className="absolute inset-y-0 left-0 w-[2px] rounded-l-2xl bg-blue-500/50 group-hover:bg-blue-400/70 transition-colors duration-150" />
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-3 font-mono">Published</div>
          <div className="text-3xl font-semibold tabular-nums font-mono">{liveReleases}</div>
          <div className="mt-1.5 text-[10px] text-white/30 font-mono">
            {draftReleases} draft · {scheduledReleases} scheduled
          </div>
          <div className="absolute bottom-3 right-4 text-[9px] text-white/15 group-hover:text-white/30 transition-colors duration-150 tracking-widest">VIEW →</div>
        </Link>

        <Link
          href="/admin/royalties"
          className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-6 hover:border-white/20 hover:from-white/[0.07] transition-all duration-150"
        >
          <div className="absolute inset-y-0 left-0 w-[2px] rounded-l-2xl bg-amber-500/60 group-hover:bg-amber-400/80 transition-colors duration-150" />
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-3 font-mono">{period} Revenue</div>
          <div className="text-3xl font-semibold tabular-nums font-mono text-amber-400/90">{formatRevenue(periodRevenue)}</div>
          <div className="mt-1.5 text-[10px] text-white/30 font-mono">Latest period</div>
          <div className="absolute bottom-3 right-4 text-[9px] text-white/15 group-hover:text-white/30 transition-colors duration-150 tracking-widest">VIEW →</div>
        </Link>

        <Link
          href="/admin/releases"
          className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-6 hover:border-white/20 hover:from-white/[0.07] transition-all duration-150"
        >
          <div className="absolute inset-y-0 left-0 w-[2px] rounded-l-2xl bg-white/20 group-hover:bg-white/40 transition-colors duration-150" />
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/30 mb-3 font-mono">Total Releases</div>
          <div className="text-3xl font-semibold tabular-nums font-mono">{releases.length}</div>
          <div className="mt-1.5 text-[10px] text-white/30 font-mono">{liveReleases} published</div>
          <div className="absolute bottom-3 right-4 text-[9px] text-white/15 group-hover:text-white/30 transition-colors duration-150 tracking-widest">VIEW →</div>
        </Link>
      </div>

      {/* Artists + Recent Releases */}
      <div className="grid gap-4 lg:grid-cols-2 mb-8">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0c10] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">Roster</h2>
            <Link href="/admin/artists" className="text-[10px] font-mono tracking-wider text-white/25 hover:text-white/60 transition-colors duration-150">
              MANAGE →
            </Link>
          </div>
          <div className="space-y-2.5">
            {artists.slice(0, 6).map((artist) => (
              <Link
                key={artist.slug}
                href={`/admin/artists/${artist.slug}/edit`}
                className="flex items-center justify-between gap-4 group px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-all duration-150 -mx-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-white transition-colors duration-150">{artist.name}</div>
                  <div className="text-[10px] text-white/30 font-mono">{artist.role} · {artist.genre}</div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full shrink-0 font-mono tracking-wider ${STATUS_CLS[artist.status ?? "active"] ?? STATUS_CLS.active}`}>
                  {artist.status ?? "active"}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0c10] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">Recent Releases</h2>
            <Link href="/admin/releases" className="text-[10px] font-mono tracking-wider text-white/25 hover:text-white/60 transition-colors duration-150">
              ALL →
            </Link>
          </div>
          <div className="space-y-2.5">
            {releases.slice(0, 5).map((release) => (
              <Link
                key={release.id}
                href={`/admin/releases/${release.slug}/edit`}
                className="flex items-center justify-between gap-4 group px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-all duration-150 -mx-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="shrink-0 w-7 h-7 rounded-lg transition-transform duration-150 group-hover:scale-105"
                    style={{
                      background: `${release.accentColor}22`,
                      border: `1px solid ${release.accentColor}44`,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-white transition-colors duration-150">{release.title}</div>
                    <div className="text-[10px] text-white/30 font-mono">{release.artistName}</div>
                  </div>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full shrink-0 font-mono tracking-wider ${
                    release.status === "published"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : release.status === "scheduled"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-white/8 text-white/35"
                  }`}
                >
                  {release.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline status strip */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a0c10] px-6 py-4 mb-8">
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/25">Pipeline</span>
          {[
            { label: "Published", value: liveReleases, color: "text-emerald-400", href: "/admin/releases?status=published" },
            { label: "Scheduled", value: scheduledReleases, color: "text-amber-400", href: "/admin/releases?status=scheduled" },
            { label: "Draft", value: draftReleases, color: "text-white/40", href: "/admin/releases?status=draft" },
            { label: "Artists Active", value: activeArtists, color: "text-blue-400", href: "/admin/artists?status=active" },
          ].map(({ label, value, color, href }) => (
            <Link key={label} href={href} className="group flex items-baseline gap-2 hover:opacity-80 transition-opacity duration-150">
              <span className={`text-base font-semibold tabular-nums font-mono ${color}`}>{value}</span>
              <span className="text-[9px] text-white/25 group-hover:text-white/40 transition-colors duration-150 tracking-wider uppercase">{label}</span>
            </Link>
          ))}
          <div className="ml-auto">
            <Link
              href="/admin/youtube/command"
              className="text-[10px] font-mono tracking-[0.2em] text-white/20 hover:text-white/50 transition-colors duration-150 uppercase"
            >
              YT Pipeline →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick nav grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/admin/royalties",       label: "Royalty Platform",        desc: "Revenue, streams, platform breakdown",      accent: "amber" },
          { href: "/admin/releases",        label: "Release Command Center",   desc: "Manage all releases and rollouts",           accent: "blue" },
          { href: "/admin/artists",         label: "Artist Management",        desc: "Roster, bios, and stats",                   accent: "emerald" },
          { href: "/admin/producers",       label: "Producer Network",         desc: "Manage producers and credits",              accent: "violet" },
          { href: "/admin/brands",          label: "Brand System",             desc: "Fashion brands and identity",               accent: "rose" },
          { href: "/admin/songs",           label: "Song Catalog",             desc: "All tracks, ISRC, rights coverage",         accent: "sky" },
          { href: "/admin/youtube/command", label: "YouTube Command Panel",    desc: "Queue health, job pipeline, channels",      accent: "red" },
          { href: "/admin/youtube/inbox",   label: "Audio Inbox",              desc: "Incoming audio, producer routing",          accent: "orange" },
          { href: "/admin/dna/builder",     label: "DNA Builder",              desc: "Artist × producer variation engine",        accent: "white" },
          { href: "/admin/finance",         label: "Finance",                  desc: "Income, expenses, label cash flow",         accent: "amber" },
          { href: "/admin/rights",          label: "Rights & Publishing",      desc: "ISRC, PRO, distribution records",           accent: "emerald" },
          { href: "/admin/news",            label: "News",                     desc: "Label news and announcements",              accent: "blue" },
        ].map((item) => {
          const accentMap: Record<string, string> = {
            amber: "group-hover:bg-amber-500/[0.08] group-hover:border-amber-500/25",
            blue: "group-hover:bg-blue-500/[0.06] group-hover:border-blue-500/20",
            emerald: "group-hover:bg-emerald-500/[0.06] group-hover:border-emerald-500/20",
            violet: "group-hover:bg-violet-500/[0.06] group-hover:border-violet-500/20",
            rose: "group-hover:bg-rose-500/[0.06] group-hover:border-rose-500/20",
            sky: "group-hover:bg-sky-500/[0.06] group-hover:border-sky-500/20",
            red: "group-hover:bg-red-500/[0.06] group-hover:border-red-500/20",
            orange: "group-hover:bg-orange-500/[0.06] group-hover:border-orange-500/20",
            white: "group-hover:bg-white/[0.05] group-hover:border-white/20",
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-all duration-150 ${accentMap[item.accent] ?? "group-hover:border-white/20 group-hover:bg-white/[0.05]"}`}
            >
              <h3 className="text-sm font-medium mb-1 group-hover:text-white transition-colors duration-150">{item.label}</h3>
              <p className="text-[11px] text-white/35 leading-relaxed">{item.desc}</p>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
