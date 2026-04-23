import { requireAdmin } from "@/lib/auth"
import { getAllReleasesAdmin } from "@/lib/db/releases"
import { getAllSongs } from "@/lib/db/songs"
import { getArtists } from "@/lib/db/artists"
import { validateForRegistration, validateReleaseForDistribution } from "@/lib/cms/validation"
import { getReleaseReadiness, getReadinessBadge } from "@/lib/cms/readiness"
import type { CMSSong, CMSRelease } from "@/lib/types"

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function SectionHead({ title, count, countColor = "text-white/40" }: {
  title: string
  count?: number
  countColor?: string
}) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">{title}</h2>
      {count !== undefined && (
        <span className={`text-xs tabular-nums font-medium ${countColor}`}>{count}</span>
      )}
    </div>
  )
}

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-400",
  warning:  "text-amber-400",
  info:     "text-sky-400",
}

const SEV_BG: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/20",
  warning:  "bg-amber-500/10 border-amber-500/20",
  info:     "bg-sky-500/10 border-sky-500/20",
}

function IssueTag({ severity }: { severity: string }) {
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide ${SEV_COLOR[severity]} ${SEV_BG[severity]}`}>
      {severity}
    </span>
  )
}

function HealthBar({ score }: { score: number }) {
  const color =
    score === 100 ? "bg-emerald-400" :
    score >= 80   ? "bg-yellow-400" :
    score >= 50   ? "bg-orange-400" : "bg-red-400"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-1 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-white/40 w-8 text-right">{score}%</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function IntegrityPage() {
  await requireAdmin()

  const [releases, songs, artists] = await Promise.all([
    getAllReleasesAdmin(),
    getAllSongs(),
    getArtists(),
  ])

  // ── Song issues ──────────────────────────────────────────────────────────
  const songIssueMap = new Map<string, ReturnType<typeof validateForRegistration>>()
  for (const song of songs) {
    const issues = validateForRegistration(song)
    if (issues.length > 0) songIssueMap.set(song.id, issues)
  }

  // ── Release issues ───────────────────────────────────────────────────────
  const releaseIssueMap = new Map<string, ReturnType<typeof validateReleaseForDistribution>>()
  for (const release of releases) {
    const issues = validateReleaseForDistribution(release)
    if (issues.length > 0) releaseIssueMap.set(release.id, issues)
  }

  // ── Readiness scores ─────────────────────────────────────────────────────
  const readinessMap = new Map<string, ReturnType<typeof getReleaseReadiness>>()
  for (const release of releases) {
    readinessMap.set(release.id, getReleaseReadiness(release, songs))
  }

  // ── Summary counts ───────────────────────────────────────────────────────
  const totalSongIssues   = [...songIssueMap.values()].reduce((s, is) => s + is.length, 0)
  const totalRelIssues    = [...releaseIssueMap.values()].reduce((s, is) => s + is.length, 0)
  const criticalSongCount = [...songIssueMap.values()].reduce((s, is) => s + is.filter(i => i.severity === "critical").length, 0)
  const criticalRelCount  = [...releaseIssueMap.values()].reduce((s, is) => s + is.filter(i => i.severity === "critical").length, 0)

  const songsNoISRC   = songs.filter(s => !s.isrc).length
  const songsNoPRO    = songs.filter(s => !s.rightsMetadata?.pro).length
  const songsNoAudio  = songs.filter(s => !s.audioUrl && !s.mediaAssetId).length
  const songsNoCredits = songs.filter(s => !s.rightsMetadata?.songwriterCredits?.length).length

  const releasesNoCover = releases.filter(r => !r.coverArtUrl).length
  const releasesNoUPC   = releases.filter(r => !r.distributionRecord?.upc && !r.providerConfig?.upc).length
  const releasesNoDist  = releases.filter(r => !r.distributionRecord?.distributor && !r.providerConfig?.distributor).length

  const overallHealth = songs.length + releases.length === 0 ? 100 :
    Math.round(100 - ((criticalSongCount + criticalRelCount) / (songs.length + releases.length)) * 50)

  // Sort releases by readiness score (worst first)
  const sortedReleases = releases
    .map(r => ({ release: r, readiness: readinessMap.get(r.id)! }))
    .sort((a, b) => a.readiness.score - b.readiness.score)

  // Sort songs with issues (critical first)
  const songsWithIssues = songs
    .filter(s => songIssueMap.has(s.id))
    .map(s => ({ song: s, issues: songIssueMap.get(s.id)! }))
    .sort((a, b) => {
      const aCrit = a.issues.filter(i => i.severity === "critical").length
      const bCrit = b.issues.filter(i => i.severity === "critical").length
      return bCrit - aCrit
    })

  return (
    <div className="px-6 py-8 max-w-5xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight">Catalog Integrity</h1>
        <p className="text-xs text-white/35 mt-1">Validation health across all releases, songs, and rights data.</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Critical Issues", value: criticalSongCount + criticalRelCount, color: criticalSongCount + criticalRelCount > 0 ? "text-red-400" : "text-emerald-400" },
          { label: "Warnings", value: totalSongIssues + totalRelIssues - criticalSongCount - criticalRelCount, color: "text-amber-400" },
          { label: "Songs Affected", value: songIssueMap.size, color: "text-white/70" },
          { label: "Releases Affected", value: releaseIssueMap.size, color: "text-white/70" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-4 py-3">
            <p className={`text-xl font-semibold tabular-nums ${color}`}>{value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Missing field quick-counts */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5 mb-8">
        <SectionHead title="Missing Field Summary" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
          {[
            { label: "Songs without ISRC",         value: songsNoISRC,    total: songs.length },
            { label: "Songs without PRO",           value: songsNoPRO,     total: songs.length },
            { label: "Songs without audio",         value: songsNoAudio,   total: songs.length },
            { label: "Songs without SW credits",    value: songsNoCredits, total: songs.length },
            { label: "Releases without cover art",  value: releasesNoCover, total: releases.length },
            { label: "Releases without UPC",        value: releasesNoUPC,  total: releases.length },
            { label: "Releases without distributor",value: releasesNoDist, total: releases.length },
          ].map(({ label, value, total }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-white/50">{label}</span>
              <span className={`text-xs tabular-nums font-medium ${value > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {value}<span className="text-white/20">/{total}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Release Readiness */}
      <div className="mb-8">
        <SectionHead title="Release Readiness" count={releases.length} />
        <div className="space-y-2">
          {sortedReleases.map(({ release, readiness }) => {
            const badge = getReadinessBadge(readiness.score)
            const failedCritical = readiness.items.filter(i => !i.passed && i.severity === "critical")
            return (
              <div key={release.id} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-5 py-3">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{release.title}</p>
                    <p className="text-[10px] text-white/30">{release.artistName} · {release.type} · {release.releaseDate}</p>
                  </div>
                  <span className={`text-[10px] border px-2 py-0.5 rounded-full shrink-0 ${badge.colorClass}`}>
                    {badge.label}
                  </span>
                </div>
                <HealthBar score={readiness.score} />
                {failedCritical.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {failedCritical.map(item => (
                      <span key={item.key} className="text-[9px] text-red-400/70 border border-red-500/15 bg-red-500/5 px-1.5 py-0.5 rounded">
                        {item.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {releases.length === 0 && (
            <p className="text-xs text-white/25 py-4">No releases found.</p>
          )}
        </div>
      </div>

      {/* Song Issues */}
      <div className="mb-8">
        <SectionHead
          title="Song Issues"
          count={songsWithIssues.length}
          countColor={songsWithIssues.length > 0 ? "text-amber-400" : "text-emerald-400"}
        />
        {songsWithIssues.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-5 py-4">
            <p className="text-sm text-emerald-400">All songs pass validation.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {songsWithIssues.slice(0, 20).map(({ song, issues }) => (
              <div key={song.id} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-5 py-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-[10px] text-white/30">{song.artistName}{song.releaseName ? ` · ${song.releaseName}` : ""}</p>
                  </div>
                  <span className="text-[10px] text-white/30 tabular-nums shrink-0">{issues.length} issue{issues.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-1">
                  {issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <IssueTag severity={issue.severity} />
                      <span className="text-[11px] text-white/45 leading-snug">{issue.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {songsWithIssues.length > 20 && (
              <p className="text-xs text-white/25 text-center py-2">
                + {songsWithIssues.length - 20} more songs with issues — fix the above first.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Release Distribution Issues */}
      {releaseIssueMap.size > 0 && (
        <div className="mb-8">
          <SectionHead title="Release Distribution Issues" count={releaseIssueMap.size} countColor="text-amber-400" />
          <div className="space-y-2">
            {releases
              .filter(r => releaseIssueMap.has(r.id))
              .map(release => {
                const issues = releaseIssueMap.get(release.id)!
                return (
                  <div key={release.id} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-5 py-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-medium">{release.title}</p>
                        <p className="text-[10px] text-white/30">{release.artistName} · {release.type}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <IssueTag severity={issue.severity} />
                          <span className="text-[11px] text-white/45 leading-snug">{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Healthy releases callout */}
      {releaseIssueMap.size === 0 && releases.length > 0 && (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-5 py-4 mb-8">
          <p className="text-sm text-emerald-400">All {releases.length} releases pass distribution validation.</p>
        </div>
      )}

    </div>
  )
}
