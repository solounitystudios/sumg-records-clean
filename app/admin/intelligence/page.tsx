import { Suspense } from "react"
import Link from "next/link"
import { getArtists } from "@/lib/db/artists"
import { getAllReleasesAdmin } from "@/lib/db/releases"
import { getRoyalties } from "@/lib/db/royalties"
import { getAllSongs } from "@/lib/db/songs"
import { formatStreams, formatRevenue } from "@/lib/data"
import { validateForRegistration, validateReleaseForDistribution } from "@/lib/cms/validation"
import { getReleaseReadiness, getReadinessBadge } from "@/lib/cms/readiness"
import { SpotifyArtistRow } from "@/components/admin/intelligence/SpotifyArtistRow"
import type { Artist } from "@/lib/data"
import type { CMSSong } from "@/lib/types"

export const metadata = { title: "Intelligence — SUMG Admin" }

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Src({ label, color = "sky" }: { label: string; color?: "sky" | "emerald" | "amber" | "slate" }) {
  const c = {
    sky:     "bg-sky-500/10 text-sky-400/80 border-sky-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20",
    amber:   "bg-amber-500/10 text-amber-400/80 border-amber-500/20",
    slate:   "bg-white/5 text-white/25 border-white/10",
  }[color]
  return (
    <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full border ${c}`}>
      {label}
    </span>
  )
}

function SectionHead({ title, src, srcColor, children }: {
  title: string
  src: string
  srcColor?: "sky" | "emerald" | "amber" | "slate"
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">{title}</h2>
        <Src label={src} color={srcColor} />
      </div>
      {children}
    </div>
  )
}

function AlertCard({
  severity,
  count,
  label,
  detail,
  href,
}: {
  severity: "critical" | "warning" | "info"
  count: number
  label: string
  detail: string
  href?: string
}) {
  if (count === 0) return null
  const s = {
    critical: { bar: "bg-red-500",    text: "text-red-400",    badge: "bg-red-500/10 border-red-500/20 text-red-400" },
    warning:  { bar: "bg-amber-400",  text: "text-amber-400",  badge: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    info:     { bar: "bg-sky-400",    text: "text-sky-400",    badge: "bg-sky-500/10 border-sky-500/20 text-sky-400" },
  }[severity]

  const inner = (
    <div className={`rounded-2xl border bg-[#0d1016] p-5 h-full ${s.badge.replace("text-", "border-").split(" ")[0]}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`text-2xl font-semibold tabular-nums ${s.text}`}>{count}</span>
        <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full border ${s.badge}`}>
          {severity}
        </span>
      </div>
      <p className="text-sm font-medium text-white/70 mb-1">{label}</p>
      <p className="text-xs text-white/35 leading-relaxed">{detail}</p>
      {href && <p className="mt-3 text-[10px] uppercase tracking-[0.15em] text-white/20">Fix →</p>}
    </div>
  )

  if (href) return <Link href={href} className="block hover:opacity-90 transition-opacity duration-150">{inner}</Link>
  return inner
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function IntelligencePage() {
  const [artists, cmsReleases, royalties, allSongs] = await Promise.all([
    getArtists(),
    getAllReleasesAdmin(),
    getRoyalties(),
    getAllSongs(),
  ])

  // ── Spotify-linked artists ────────────────────────────────────────────
  const linkedArtists = artists.filter(
    (a): a is Artist & { spotifyId: string } => !!a.spotifyId
  )

  // ── Money leak computation ────────────────────────────────────────────
  const songsNoISRC       = allSongs.filter((s) => !s.isrc)
  const songsNoPRO        = allSongs.filter((s) => !s.rightsMetadata?.pro)
  const songsNoCredits    = allSongs.filter((s) => !(s.rightsMetadata?.songwriterCredits?.length))
  const songsNoAudio      = allSongs.filter((s) => !s.audioUrl && !s.mediaAssetId)
  const releasesNoCover   = cmsReleases.filter((r) => !r.coverArtUrl)
  const releasesNoUPC     = cmsReleases.filter(
    (r) => !r.distributionRecord?.upc && !r.providerConfig?.upc
  )
  const releasesNoDist    = cmsReleases.filter(
    (r) => !r.distributionRecord?.distributor && !r.providerConfig?.distributor
  )

  const totalAlerts =
    songsNoISRC.length + songsNoPRO.length + songsNoCredits.length +
    releasesNoCover.length + releasesNoUPC.length

  // ── Artist leaderboard ────────────────────────────────────────────────
  const q1 = royalties.filter((r) => r.period === "2026-Q1")
  const artistLeaderboard = [...artists]
    .map((a) => {
      const royaltyRow = q1.find((r) => r.artistSlug === a.slug)
      return { ...a, q1Revenue: royaltyRow?.revenue ?? 0, q1Streams: royaltyRow?.streams ?? 0 }
    })
    .sort((a, b) => b.totalStreams - a.totalStreams)

  // ── Revenue by platform ───────────────────────────────────────────────
  const platformTotals: Record<string, { streams: number; revenue: number }> = {}
  q1.forEach((rec) => {
    rec.platforms.forEach(({ platform, streams, revenue }) => {
      if (!platformTotals[platform]) platformTotals[platform] = { streams: 0, revenue: 0 }
      platformTotals[platform].streams += streams
      platformTotals[platform].revenue += revenue
    })
  })
  const platformList = Object.entries(platformTotals).sort((a, b) => b[1].revenue - a[1].revenue)
  const totalRevenue  = platformList.reduce((s, [, d]) => s + d.revenue, 0)
  const maxRevenue    = platformList[0]?.[1].revenue ?? 1

  const q4 = royalties.filter((r) => r.period === "2025-Q4")
  const q1Total = q1.reduce((s, r) => s + r.revenue, 0)
  const q4Total = q4.reduce((s, r) => s + r.revenue, 0)
  const qoqGrowth = q4Total > 0 ? (((q1Total - q4Total) / q4Total) * 100).toFixed(1) : null

  // ── Catalog readiness ────────────────────────────────────────────────
  const readinessData = cmsReleases.map((r) => ({
    release: r,
    readiness: getReleaseReadiness(r, allSongs),
    badge: getReadinessBadge(getReleaseReadiness(r, allSongs).score),
  }))
  const releaseIssues = cmsReleases.flatMap((r) =>
    validateReleaseForDistribution(r).map((issue) => ({ ...issue, release: r }))
  )

  // ── Song validation ──────────────────────────────────────────────────
  const songIssues = allSongs.flatMap((s) =>
    validateForRegistration(s).map((issue) => ({ ...issue, song: s }))
  )
  const criticalSongIssues  = songIssues.filter((i) => i.severity === "critical")
  const warningSongIssues   = songIssues.filter((i) => i.severity === "warning")

  // ── ISRC coverage ────────────────────────────────────────────────────
  const isrcCoverage = allSongs.length > 0
    ? Math.round(((allSongs.length - songsNoISRC.length) / allSongs.length) * 100)
    : 0

  // ── Publishing / PRO ─────────────────────────────────────────────────
  const proGroups: Record<string, CMSSong[]> = {}
  allSongs.forEach((s) => {
    const pro = s.rightsMetadata?.pro ?? "No PRO"
    if (!proGroups[pro]) proGroups[pro] = []
    proGroups[pro].push(s)
  })
  const songtrust = allSongs.filter(
    (s) => s.rightsMetadata?.publishingAdmin?.toLowerCase().includes("songtrust")
  )

  // ── Composition registration ─────────────────────────────────────────
  const compositionByStatus: Record<string, CMSSong[]> = {}
  allSongs.forEach((s) => {
    const status = s.rightsMetadata?.compositionStatus ?? "not_set"
    if (!compositionByStatus[status]) compositionByStatus[status] = []
    compositionByStatus[status].push(s)
  })

  // ── Producer queue ────────────────────────────────────────────────────
  const songsInDraft       = allSongs.filter((s) => s.status === "draft")
  const songsNoProd        = allSongs.filter((s) => !(s.producerSlugs?.length))
  const songsReadyToPublish = allSongs.filter(
    (s) => s.status === "draft" && s.audioUrl && s.isrc && (s.producerSlugs?.length ?? 0) > 0
  )

  // ── YouTube channel URLs (real field, no metrics) ─────────────────────
  const youtubeLinks = artists
    .filter((a) => a.socialLinks?.youtube)
    .map((a) => ({ name: a.name, url: a.socialLinks!.youtube! }))

  return (
    <main className="px-6 py-10 md:px-10 max-w-6xl">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Intelligence</h1>
        <p className="mt-2 text-sm text-white/50">
          Catalog health, missing metadata, revenue, and platform monitoring.
        </p>
      </div>

      {/* ── Summary bar ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        {[
          { label: "Open Alerts",       value: totalAlerts,            accent: totalAlerts > 0 ? "text-red-400" : "text-emerald-400" },
          { label: "Songs without ISRC",value: songsNoISRC.length,     accent: songsNoISRC.length > 0 ? "text-amber-400" : "text-emerald-400" },
          { label: "Releases no UPC",   value: releasesNoUPC.length,   accent: releasesNoUPC.length > 0 ? "text-amber-400" : "text-emerald-400" },
          { label: "ISRC Coverage",     value: `${isrcCoverage}%`,     accent: isrcCoverage < 100 ? "text-amber-400" : "text-emerald-400" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-2">{label}</p>
            <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Money Leak Alerts ── */}
      <section className="mb-10">
        <SectionHead title="Money Leak Alerts" src="■ DB computed" srcColor="sky">
          <span className="text-[10px] text-white/25">Issues that cost real royalties</span>
        </SectionHead>

        {totalAlerts === 0 && songsNoAudio.length === 0 && releasesNoCover.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] border-dashed bg-white/[0.01] p-8 text-center">
            <p className="text-sm text-emerald-400 font-medium mb-1">No critical issues found</p>
            <p className="text-xs text-white/25">All songs have ISRC, PRO, and songwriter credits on file.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AlertCard
              severity="critical"
              count={songsNoISRC.length}
              label="Songs without ISRC"
              detail="Cannot register at SoundExchange. Missing digital performance royalties."
              href="/admin/lyrics"
            />
            <AlertCard
              severity="critical"
              count={releasesNoCover.length}
              label="Releases without cover art"
              detail="Blocked from distribution submission. Required by all distributors."
              href="/admin/releases"
            />
            <AlertCard
              severity="warning"
              count={songsNoPRO.length}
              label="Songs without PRO"
              detail="No Performing Rights Org assigned. Losing performance royalties (BMI / ASCAP / SESAC)."
              href="/admin/lyrics"
            />
            <AlertCard
              severity="warning"
              count={songsNoCredits.length}
              label="Songs without songwriter credits"
              detail="Cannot register composition with PRO. Publishing royalties are unclaimable."
              href="/admin/lyrics"
            />
            <AlertCard
              severity="warning"
              count={releasesNoUPC.length}
              label="Releases without UPC"
              detail="UPC required for DSP distribution. Set via distribution record."
              href="/admin/releases"
            />
            <AlertCard
              severity="warning"
              count={releasesNoDist.length}
              label="Releases without distributor"
              detail="No distributor assigned. Revenue pipeline is not established."
              href="/admin/releases"
            />
            <AlertCard
              severity="info"
              count={songsNoAudio.length}
              label="Songs without audio"
              detail="Audio file required before distribution can be submitted."
              href="/admin/lyrics"
            />
            <AlertCard
              severity="info"
              count={criticalSongIssues.length}
              label="Critical song validation issues"
              detail={`${warningSongIssues.length} warning-level issues also open across the catalog.`}
              href="/admin/lyrics"
            />
          </div>
        )}
      </section>

      {/* ── Artist Leaderboard + Revenue ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px] mb-10">

        {/* Artist Leaderboard */}
        <section>
          <SectionHead title="Artist Leaderboard" src="■ DB" srcColor="sky" />
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-3 border-b border-white/[0.06]">
              {["Artist", "Streams", "Monthly", "Q1 Rev"].map((h) => (
                <span key={h} className="text-[9px] uppercase tracking-[0.18em] text-white/25">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-white/[0.04]">
              {artistLeaderboard.map((a, i) => (
                <div key={a.slug} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] text-white/20 tabular-nums w-3 shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-white/30 truncate">{a.genre}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-white/70">{formatStreams(a.totalStreams)}</span>
                  <span className="text-xs tabular-nums text-white/45">{formatStreams(a.monthlyListeners)}</span>
                  <span className={`text-xs tabular-nums font-medium ${a.q1Revenue > 0 ? "text-emerald-400" : "text-white/20"}`}>
                    {a.q1Revenue > 0 ? formatRevenue(a.q1Revenue) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Revenue by Platform */}
        <section>
          <SectionHead title="Revenue by Source — Q1 2026" src="■ DB" srcColor="sky" />
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-5">
            {platformList.length === 0 ? (
              <p className="text-xs text-white/30">No platform data for Q1 2026.</p>
            ) : (
              <div className="space-y-4">
                {platformList.map(([platform, data]) => {
                  const pct = totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : "0"
                  return (
                    <div key={platform}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 font-medium">{platform}</span>
                        <span className="text-white/70 tabular-nums">{pct}%</span>
                      </div>
                      <div className="w-full bg-white/[0.05] rounded-full h-1.5 mb-1">
                        <div
                          className="bg-violet-400 h-1.5 rounded-full"
                          style={{ width: `${(data.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-white/25">
                        <span>{formatRevenue(data.revenue)}</span>
                        <span>{formatStreams(data.streams)} streams</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-white/[0.06] space-y-2">
              {[
                { period: "Q1 2026", revenue: q1Total },
                { period: "Q4 2025", revenue: q4Total },
              ].map(({ period, revenue }) => (
                <div key={period} className="flex justify-between items-center">
                  <span className="text-xs text-white/40">{period}</span>
                  <span className="text-sm font-medium tabular-nums">{formatRevenue(revenue)}</span>
                </div>
              ))}
              {qoqGrowth && (
                <div className="flex justify-between items-center pt-1 border-t border-white/[0.05]">
                  <span className="text-xs text-white/30">QoQ</span>
                  <span className={`text-xs font-medium tabular-nums ${parseFloat(qoqGrowth) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {parseFloat(qoqGrowth) >= 0 ? "+" : ""}{qoqGrowth}%
                  </span>
                </div>
              )}
              <p className="text-[10px] text-white/20 pt-1 leading-relaxed">
                Distributed DSP royalties only. Does not include PRO performance royalties or mechanical publishing income.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Spotify Intelligence ── */}
      <section className="mb-10">
        <SectionHead title="Spotify Intelligence" src="◉ Spotify API" srcColor="emerald">
          <Link href="/admin/spotify" className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150">
            Full panel →
          </Link>
        </SectionHead>

        {linkedArtists.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] border-dashed bg-white/[0.01] p-8 text-center">
            <p className="text-sm text-white/40 mb-1">No artists linked to Spotify</p>
            <Link href="/admin/spotify" className="text-xs text-white/30 underline">
              Link artists →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {linkedArtists.map((artist) => (
              <Suspense
                key={artist.slug}
                fallback={
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0d1016] p-5 animate-pulse">
                    <div className="h-4 w-32 bg-white/5 rounded mb-2" />
                    <div className="h-3 w-20 bg-white/5 rounded" />
                  </div>
                }
              >
                <SpotifyArtistRow artist={artist} />
              </Suspense>
            ))}
          </div>
        )}
      </section>

      {/* ── ISRC / SoundExchange ── */}
      <section className="mb-10">
        <SectionHead title="ISRC / SoundExchange Coverage" src="■ DB" srcColor="sky">
          <span className="text-[10px] text-white/25">{allSongs.length - songsNoISRC.length}/{allSongs.length} songs have ISRC</span>
        </SectionHead>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          {/* Coverage bar */}
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-white/50">ISRC coverage</span>
              <span className={`font-medium ${isrcCoverage < 80 ? "text-amber-400" : "text-emerald-400"}`}>{isrcCoverage}%</span>
            </div>
            <div className="w-full bg-white/[0.05] rounded-full h-2">
              <div
                className={`h-2 rounded-full ${isrcCoverage < 80 ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${isrcCoverage}%` }}
              />
            </div>
            <p className="text-[10px] text-white/20 mt-2">
              Songs without ISRC cannot be registered with SoundExchange for digital performance royalties.
            </p>
          </div>

          {allSongs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-white/30">No songs in the catalog yet.</div>
          ) : (
            <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
              {allSongs.map((song) => (
                <div key={song.id} className="flex items-center justify-between gap-4 px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-white/30 truncate">{song.artistName}{song.releaseName ? ` · ${song.releaseName}` : ""}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {song.isrc ? (
                      <>
                        <code className="text-[10px] font-mono text-emerald-400/80">{song.isrc}</code>
                        <span className="text-[9px] text-emerald-400/60 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">set</span>
                      </>
                    ) : (
                      <span className="text-[9px] text-amber-400/70 border border-amber-500/20 px-1.5 py-0.5 rounded-full">missing</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Publishing / PRO Status ── */}
      <section className="mb-10">
        <SectionHead title="Publishing / PRO Status" src="■ DB" srcColor="sky" />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* PRO Groups */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <p className="text-xs font-medium text-white/60">By PRO</p>
            </div>
            {Object.keys(proGroups).length === 0 ? (
              <div className="px-5 py-6 text-xs text-white/30">No songs in catalog.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {Object.entries(proGroups).sort((a, b) => b[1].length - a[1].length).map(([pro, songs]) => (
                  <div key={pro} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pro === "No PRO" ? "bg-amber-400" : "bg-sky-400"}`} />
                      <span className="text-sm text-white/70">{pro}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{songs.length}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Composition registration status */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <p className="text-xs font-medium text-white/60">Composition Registration</p>
            </div>
            {Object.keys(compositionByStatus).length === 0 ? (
              <div className="px-5 py-6 text-xs text-white/30">No songs in catalog.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {Object.entries(compositionByStatus).sort((a, b) => b[1].length - a[1].length).map(([status, songs]) => {
                  const dot = {
                    registered: "bg-emerald-400",
                    pending:    "bg-amber-400",
                    draft:      "bg-white/20",
                    issue:      "bg-red-400",
                    not_set:    "bg-white/10",
                  }[status] ?? "bg-white/10"
                  return (
                    <div key={status} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                        <span className="text-sm text-white/70 capitalize">{status.replace("_", " ")}</span>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{songs.length}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01]">
              <p className="text-[10px] text-white/20">
                BMI/ASCAP have no public API. Status is set manually in each song&apos;s rights metadata.
              </p>
            </div>
          </div>
        </div>

        {/* Songtrust */}
        {songtrust.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <p className="text-xs font-medium text-white/60">Songtrust — Publishing Admin</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {songtrust.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-white/35">{s.artistName}</p>
                  </div>
                  <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full border ${
                    s.rightsMetadata?.compositionStatus === "registered"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  }`}>
                    {s.rightsMetadata?.compositionStatus ?? "draft"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Catalog Readiness ── */}
      <section className="mb-10">
        <SectionHead title="Catalog Readiness" src="■ DB validation" srcColor="sky">
          <Link href="/admin/releases" className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150">
            Manage releases →
          </Link>
        </SectionHead>

        {cmsReleases.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] border-dashed bg-white/[0.01] p-8 text-center text-sm text-white/30">
            No releases in catalog.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {readinessData.map(({ release, readiness, badge }) => {
                const critFails = readiness.items.filter((i) => i.severity === "critical" && !i.passed)
                const warnFails = readiness.items.filter((i) => i.severity === "warning" && !i.passed)
                return (
                  <div key={release.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{release.title}</p>
                          <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full border ${badge.colorClass}`}>
                            {badge.label}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                            release.status === "published"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : release.status === "draft"
                              ? "bg-white/8 text-white/30"
                              : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {release.status}
                          </span>
                        </div>
                        <p className="text-xs text-white/35 mt-0.5">{release.artistName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold tabular-nums">{readiness.score}<span className="text-white/20 text-xs">/100</span></p>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="w-full bg-white/[0.05] rounded-full h-1.5 mb-2">
                      <div
                        className={`h-1.5 rounded-full ${readiness.score >= 80 ? "bg-emerald-400" : readiness.score >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${readiness.score}%` }}
                      />
                    </div>
                    {/* Issue list */}
                    {(critFails.length > 0 || warnFails.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {critFails.map((item) => (
                          <span key={item.key} className="text-[10px] text-red-400/70 bg-red-500/[0.08] border border-red-500/15 px-2 py-0.5 rounded-full">
                            {item.label}
                          </span>
                        ))}
                        {warnFails.map((item) => (
                          <span key={item.key} className="text-[10px] text-amber-400/70 bg-amber-500/[0.08] border border-amber-500/15 px-2 py-0.5 rounded-full">
                            {item.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Producer Queue ── */}
      <section className="mb-10">
        <SectionHead title="Producer Upload Queue" src="■ DB" srcColor="sky">
          <Link href="/admin/producers" className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150">
            Manage producers →
          </Link>
        </SectionHead>

        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          {[
            { label: "Songs in draft",        value: songsInDraft.length,      accent: songsInDraft.length > 0 ? "text-amber-400" : "text-white/60" },
            { label: "Missing audio",          value: songsNoAudio.length,      accent: songsNoAudio.length > 0 ? "text-amber-400" : "text-white/60" },
            { label: "No producer credits",   value: songsNoProd.length,       accent: songsNoProd.length > 0 ? "text-amber-400" : "text-white/60" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/25 mb-1.5">{label}</p>
              <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
            </div>
          ))}
        </div>

        {songsReadyToPublish.length > 0 && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <p className="text-xs text-emerald-400 font-medium mb-1">
              {songsReadyToPublish.length} song{songsReadyToPublish.length !== 1 ? "s" : ""} ready to publish
            </p>
            <p className="text-xs text-white/35">
              These drafts have audio, ISRC, and producer credits — ready for status change.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {songsReadyToPublish.slice(0, 6).map((s) => (
                <span key={s.id} className="text-[10px] text-white/50 border border-white/10 px-2 py-0.5 rounded-full">
                  {s.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {songsInDraft.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <p className="text-xs text-white/40">Draft songs</p>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-56 overflow-y-auto">
              {songsInDraft.map((song) => (
                <div key={song.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-white/30 truncate">{song.artistName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] border px-1.5 py-0.5 rounded-full ${song.audioUrl ? "text-emerald-400/60 border-emerald-500/20" : "text-white/20 border-white/10"}`}>
                      {song.audioUrl ? "audio" : "no audio"}
                    </span>
                    <span className={`text-[9px] border px-1.5 py-0.5 rounded-full ${song.isrc ? "text-emerald-400/60 border-emerald-500/20" : "text-amber-400/60 border-amber-500/20"}`}>
                      {song.isrc ? "ISRC" : "no ISRC"}
                    </span>
                    <span className={`text-[9px] border px-1.5 py-0.5 rounded-full ${(song.producerSlugs?.length ?? 0) > 0 ? "text-emerald-400/60 border-emerald-500/20" : "text-white/20 border-white/10"}`}>
                      {(song.producerSlugs?.length ?? 0) > 0 ? "credits" : "no credits"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── YouTube ── */}
      <section className="mb-10">
        <SectionHead title="YouTube" src="◌ No data source" srcColor="slate" />

        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          {youtubeLinks.length > 0 && (
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <p className="text-xs text-white/40 mb-3">Channel links on file</p>
              <div className="space-y-2">
                {youtubeLinks.map(({ name, url }) => (
                  <div key={name} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/60">{name}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/30 font-mono hover:text-white/60 transition-colors duration-150 truncate max-w-xs"
                    >
                      {url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 py-5">
            <p className="text-sm text-white/40 font-medium mb-2">No YouTube analytics data</p>
            <p className="text-xs text-white/25 leading-relaxed max-w-xl">
              YouTube channel-level analytics require{" "}
              <strong className="text-white/40">YouTube Data API v3</strong> with OAuth 2.0 user
              authorization — a verified channel owner must grant access. This cannot be done
              with a service key alone. To enable: add{" "}
              <code className="font-mono text-white/35">YOUTUBE_CLIENT_ID</code>,{" "}
              <code className="font-mono text-white/35">YOUTUBE_CLIENT_SECRET</code>, and an
              OAuth token per channel to your environment. Until then, click the channel links
              above to view stats directly in YouTube Studio.
            </p>
          </div>
        </div>
      </section>

      {/* ── Songtrust / SoundExchange note ── */}
      <section>
        <SectionHead title="SoundExchange · Songtrust · BMI" src="◌ No live API" srcColor="slate" />
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-6">
          <p className="text-xs text-white/30 leading-relaxed mb-4">
            None of these organizations provide a real-time public API for third-party status queries.
            Registration data is managed manually:
          </p>
          <div className="space-y-3">
            {[
              {
                label: "SoundExchange",
                note:  "Register master recordings via their portal using the ISRC data above. No API.",
                link:  "https://www.soundexchange.com",
              },
              {
                label: "BMI",
                note:  "Register compositions via BMI Songview. Set bmiWorkUrl on each song to link back.",
                link:  "https://songview.bmi.com",
              },
              {
                label: "Songtrust",
                note:  "Set publishingAdmin = 'Songtrust' and compositionStatus on each song to track claims.",
                link:  "https://www.songtrust.com",
              },
              {
                label: "ASCAP",
                note:  "Register via ACE repertoire system. No public API — manual status entry only.",
                link:  "https://www.ascap.com",
              },
            ].map(({ label, note, link }) => (
              <div key={label} className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-sm font-medium text-white/60">{label}</p>
                  <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{note}</p>
                </div>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/25 hover:text-white/50 transition-colors duration-150 shrink-0"
                >
                  Portal →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
