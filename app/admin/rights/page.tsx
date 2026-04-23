import { requireAdmin } from "@/lib/auth"
import { getAllReleasesAdmin } from "@/lib/db/releases"
import { getAllSongs } from "@/lib/db/songs"
import type { CMSSong } from "@/lib/types"

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">{title}</h2>
      {count !== undefined && <span className="text-xs tabular-nums text-white/30">{count}</span>}
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  registered: "text-emerald-400 border-emerald-800/40",
  pending:    "text-sky-400 border-sky-800/40",
  issue:      "text-red-400 border-red-800/40",
  draft:      "text-white/25 border-white/10",
}

function CompositionBadge({ status }: { status?: string }) {
  const s = status ?? "draft"
  return (
    <span className={`text-[9px] uppercase tracking-wide border px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[s] ?? STATUS_COLOR.draft}`}>
      {s}
    </span>
  )
}

function PortalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.07] bg-[#0d1016] hover:border-white/[0.13] hover:bg-white/[0.02] transition-colors duration-150 group"
    >
      <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{label}</span>
      <span className="text-white/20 group-hover:text-white/40 transition-colors text-xs">↗</span>
    </a>
  )
}

function CoverageBar({ have, total, label }: { have: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((have / total) * 100) : 100
  const color = pct === 100 ? "bg-emerald-400" : pct >= 70 ? "bg-yellow-400" : "bg-red-400"
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs tabular-nums text-white/40">{have}<span className="text-white/20">/{total}</span></span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-1 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RightsPage() {
  await requireAdmin()

  const [releases, songs] = await Promise.all([
    getAllReleasesAdmin(),
    getAllSongs(),
  ])

  // ── ISRC coverage ────────────────────────────────────────────────────────
  const songsWithISRC    = songs.filter(s => s.isrc)
  const songsWithoutISRC = songs.filter(s => !s.isrc)

  // ── PRO breakdown ────────────────────────────────────────────────────────
  const proMap = new Map<string, CMSSong[]>()
  for (const song of songs) {
    const pro = song.rightsMetadata?.pro ?? "Unassigned"
    if (!proMap.has(pro)) proMap.set(pro, [])
    proMap.get(pro)!.push(song)
  }
  const proEntries = [...proMap.entries()].sort((a, b) => b[1].length - a[1].length)

  // ── Composition status breakdown ─────────────────────────────────────────
  const compStatusMap = new Map<string, number>()
  for (const song of songs) {
    const status = song.rightsMetadata?.compositionStatus ?? "draft"
    compStatusMap.set(status, (compStatusMap.get(status) ?? 0) + 1)
  }

  // ── Songwriter credits coverage ──────────────────────────────────────────
  const songsWithCredits  = songs.filter(s => (s.rightsMetadata?.songwriterCredits?.length ?? 0) > 0)
  const songsWithPublisher = songs.filter(s => s.rightsMetadata?.publisher)
  const songsWithIPI      = songs.filter(s => s.rightsMetadata?.ipiCae)

  // ── SoundExchange status ─────────────────────────────────────────────────
  const sxMap = new Map<string, number>()
  for (const song of songs) {
    const status = (song.rightsMetadata as { soundExchangeStatus?: string } | undefined)?.soundExchangeStatus ?? "not_registered"
    sxMap.set(status, (sxMap.get(status) ?? 0) + 1)
  }

  // ── Release rights ───────────────────────────────────────────────────────
  const releasesWithRights    = releases.filter(r => r.rightsMetadata)
  const releasesWithDist      = releases.filter(r => r.distributionRecord?.distributor || r.providerConfig?.distributor)
  const releasesWithUPC       = releases.filter(r => r.distributionRecord?.upc || r.providerConfig?.upc)
  const releasesWithCover     = releases.filter(r => r.coverArtUrl)

  // ── Songs with issues grouped by type ────────────────────────────────────
  const songsNoCreditsData = songs.filter(s => !s.rightsMetadata?.songwriterCredits?.length)

  return (
    <div className="px-6 py-8 max-w-5xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight">Rights</h1>
        <p className="text-xs text-white/35 mt-1">Publishing rights, PRO affiliations, ISRC coverage, and distribution records.</p>
      </div>

      {/* Coverage overview */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5 mb-8">
        <SectionHead title="Coverage Overview" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <CoverageBar have={songsWithISRC.length}     total={songs.length}    label="Songs with ISRC" />
          <CoverageBar have={songsWithCredits.length}  total={songs.length}    label="Songs with songwriter credits" />
          <CoverageBar have={songs.filter(s => s.rightsMetadata?.pro).length} total={songs.length} label="Songs with PRO assigned" />
          <CoverageBar have={songsWithPublisher.length} total={songs.length}   label="Songs with publisher" />
          <CoverageBar have={releasesWithUPC.length}   total={releases.length} label="Releases with UPC" />
          <CoverageBar have={releasesWithCover.length} total={releases.length} label="Releases with cover art" />
          <CoverageBar have={releasesWithDist.length}  total={releases.length} label="Releases with distributor" />
        </div>
      </div>

      {/* PRO breakdown */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5 mb-8">
        <SectionHead title="PRO Breakdown" />
        <div className="space-y-3">
          {proEntries.map(([pro, proSongs]) => {
            const pct = songs.length > 0 ? (proSongs.length / songs.length) * 100 : 0
            return (
              <div key={pro}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/60 font-medium">{pro}</span>
                  <span className="text-xs tabular-nums text-white/35">{proSongs.length} song{proSongs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={pro === "Unassigned" ? "h-1 rounded-full bg-red-400/50" : "h-1 rounded-full bg-white/30"}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Composition status */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5 mb-8">
        <SectionHead title="Composition Registration Status" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["registered", "pending", "draft", "issue"] as const).map(status => (
            <div key={status}>
              <p className="text-xl font-semibold tabular-nums">{compStatusMap.get(status) ?? 0}</p>
              <div className="mt-1">
                <CompositionBadge status={status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ISRC — songs without */}
      {songsWithoutISRC.length > 0 && (
        <div className="mb-8">
          <SectionHead title="Songs Missing ISRC" count={songsWithoutISRC.length} />
          <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {songsWithoutISRC.slice(0, 15).map(song => (
                <div key={song.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{song.title}</p>
                    <p className="text-[10px] text-white/30">{song.artistName}{song.releaseName ? ` · ${song.releaseName}` : ""}</p>
                  </div>
                  <CompositionBadge status={song.rightsMetadata?.compositionStatus} />
                </div>
              ))}
              {songsWithoutISRC.length > 15 && (
                <div className="px-5 py-2.5 text-xs text-white/25">
                  + {songsWithoutISRC.length - 15} more without ISRC
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Songs without songwriter credits */}
      {songsNoCreditsData.length > 0 && (
        <div className="mb-8">
          <SectionHead title="Songs Missing Songwriter Credits" count={songsNoCreditsData.length} />
          <div className="rounded-xl border border-amber-500/10 bg-[#0d1016] overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {songsNoCreditsData.slice(0, 10).map(song => (
                <div key={song.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{song.title}</p>
                    <p className="text-[10px] text-white/30">{song.artistName}</p>
                  </div>
                  <span className="text-[9px] text-amber-400/60 border border-amber-500/20 px-1.5 py-0.5 rounded">no credits</span>
                </div>
              ))}
              {songsNoCreditsData.length > 10 && (
                <div className="px-5 py-2.5 text-xs text-white/25">+ {songsNoCreditsData.length - 10} more</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Release distribution records */}
      <div className="mb-8">
        <SectionHead title="Release Distribution Records" count={releases.length} />
        <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-2 border-b border-white/[0.05]">
            <span className="text-[9px] text-white/25 uppercase tracking-wide">Release</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wide">Distributor</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wide">UPC</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wide">Status</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {releases.map(release => {
              const dist = release.distributionRecord?.distributor ?? release.providerConfig?.distributor
              const upc  = release.distributionRecord?.upc ?? release.providerConfig?.upc
              const subStatus = release.distributionRecord?.submissionStatus ?? release.providerConfig?.submissionStatus
              return (
                <div key={release.id} className="grid grid-cols-4 px-5 py-2.5 items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{release.title}</p>
                    <p className="text-[10px] text-white/30">{release.artistName}</p>
                  </div>
                  <span className="text-xs text-white/50 truncate">{dist ?? <span className="text-white/20">—</span>}</span>
                  <span className="text-[10px] font-mono text-white/40 truncate">{upc ?? <span className="text-white/20">—</span>}</span>
                  <span className="text-[10px] text-white/40 capitalize">{subStatus ?? <span className="text-white/20">—</span>}</span>
                </div>
              )
            })}
            {releases.length === 0 && (
              <div className="px-5 py-4 text-xs text-white/25">No releases found.</div>
            )}
          </div>
        </div>
      </div>

      {/* External portals */}
      <div>
        <SectionHead title="Rights & Distribution Portals" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PortalLink href="https://royaltyportal.bmi.com" label="BMI Royalty Portal" />
          <PortalLink href="https://www.ascap.com/members" label="ASCAP Member Portal" />
          <PortalLink href="https://app.songtrust.com" label="Songtrust" />
          <PortalLink href="https://www.soundexchange.com/service-provider/log-in" label="SoundExchange" />
          <PortalLink href="https://distrokid.com/hypeddit/dashboard" label="DistroKid" />
          <PortalLink href="https://app.tunecore.com" label="TuneCore" />
        </div>
        <p className="text-[10px] text-white/20 mt-3">External portals — registration and registration status must be managed directly. No API integration.</p>
      </div>

    </div>
  )
}
