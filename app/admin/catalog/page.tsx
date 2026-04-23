import { requireAdmin } from "@/lib/auth"
import { getAllReleasesAdmin } from "@/lib/db/releases"
import { getAllSongs } from "@/lib/db/songs"
import { getArtists } from "@/lib/db/artists"
import { getProducers } from "@/lib/db/producers"
import Link from "next/link"

function SectionHead({ title }: { title: string }) {
  return (
    <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40 mb-4">{title}</h2>
  )
}

function StatCard({ label, value, sub, href }: {
  label: string
  value: number | string
  sub?: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-5 py-4 hover:border-white/[0.13] hover:bg-white/[0.02] transition-colors duration-150 block"
    >
      <p className="text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="text-xs text-white/50 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-white/25 mt-1">{sub}</p>}
    </Link>
  )
}

const STATUS_COLOR: Record<string, string> = {
  published: "bg-emerald-400",
  scheduled: "bg-sky-400",
  draft:     "bg-white/20",
  archived:  "bg-white/10",
}

export default async function CatalogPage() {
  await requireAdmin()

  const [releases, songs, artists, producers] = await Promise.all([
    getAllReleasesAdmin(),
    getAllSongs(),
    getArtists(),
    getProducers(),
  ])

  // ── Release breakdown by status ──────────────────────────────────────────
  const relByStatus = releases.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  // ── Release breakdown by type ────────────────────────────────────────────
  const relByType = releases.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1
    return acc
  }, {})

  // ── Song breakdown by status ─────────────────────────────────────────────
  const songByStatus = songs.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {})

  // ── Release count per artist ─────────────────────────────────────────────
  const relPerArtist = releases.reduce<Record<string, number>>((acc, r) => {
    acc[r.artistSlug] = (acc[r.artistSlug] ?? 0) + 1
    return acc
  }, {})

  // ── Song count per artist ────────────────────────────────────────────────
  const songPerArtist = songs.reduce<Record<string, number>>((acc, s) => {
    acc[s.artistSlug] = (acc[s.artistSlug] ?? 0) + 1
    return acc
  }, {})

  // ── Recently updated releases (top 8) ────────────────────────────────────
  const recentReleases = [...releases]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)

  // ── Recently updated songs (top 8) ───────────────────────────────────────
  const recentSongs = [...songs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)

  return (
    <div className="px-6 py-8 max-w-5xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight">Catalog</h1>
        <p className="text-xs text-white/35 mt-1">Aggregated view across the full SUMG Records catalog.</p>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard label="Artists"   value={artists.length}   href="/admin/artists" />
        <StatCard label="Releases"  value={releases.length}  href="/admin/releases" />
        <StatCard label="Songs"     value={songs.length}     href="/admin/lyrics" />
        <StatCard label="Producers" value={producers.length} href="/admin/producers" />
      </div>

      {/* Release pipeline */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5 mb-8">
        <SectionHead title="Release Pipeline" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {(["draft", "scheduled", "published", "archived"] as const).map(status => (
            <div key={status}>
              <p className="text-xl font-semibold tabular-nums">{relByStatus[status] ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[status]}`} />
                <p className="text-[10px] text-white/35 capitalize">{status}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Type breakdown */}
        <div className="border-t border-white/[0.05] pt-4">
          <p className="text-[10px] text-white/25 uppercase tracking-wide mb-3">By Type</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(relByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="text-sm font-medium tabular-nums">{count}</span>
                <span className="text-[10px] text-white/35">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Song pipeline */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5 mb-8">
        <SectionHead title="Song Pipeline" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {(["draft", "scheduled", "published", "archived"] as const).map(status => (
            <div key={status}>
              <p className="text-xl font-semibold tabular-nums">{songByStatus[status] ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[status]}`} />
                <p className="text-[10px] text-white/35 capitalize">{status}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.05] pt-4 flex flex-wrap gap-5 text-xs text-white/40">
          <span>{songs.filter(s => s.isrc).length}<span className="text-white/25"> ISRC set</span></span>
          <span>{songs.filter(s => s.audioUrl || s.mediaAssetId).length}<span className="text-white/25"> with audio</span></span>
          <span>{songs.filter(s => s.isExplicit).length}<span className="text-white/25"> explicit</span></span>
          <span>{songs.filter(s => s.rightsMetadata?.pro).length}<span className="text-white/25"> PRO assigned</span></span>
          <span>{songs.filter(s => s.lyrics).length}<span className="text-white/25"> with lyrics</span></span>
        </div>
      </div>

      {/* Artist roster */}
      <div className="mb-8">
        <SectionHead title="Artist Roster" />
        <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {artists.map(artist => (
              <div key={artist.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{artist.name}</p>
                  <p className="text-[10px] text-white/30">{artist.genre}</p>
                </div>
                <div className="flex items-center gap-5 text-right shrink-0">
                  <div>
                    <p className="text-sm tabular-nums font-medium">{relPerArtist[artist.slug] ?? 0}</p>
                    <p className="text-[10px] text-white/25">releases</p>
                  </div>
                  <div>
                    <p className="text-sm tabular-nums font-medium">{songPerArtist[artist.slug] ?? 0}</p>
                    <p className="text-[10px] text-white/25">songs</p>
                  </div>
                </div>
              </div>
            ))}
            {artists.length === 0 && (
              <div className="px-5 py-4 text-xs text-white/25">No artists found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Recent releases */}
        <div>
          <SectionHead title="Recently Updated Releases" />
          <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {recentReleases.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{r.title}</p>
                    <p className="text-[10px] text-white/30">{r.artistName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[r.status]}`} />
                    <span className="text-[10px] text-white/30 capitalize">{r.status}</span>
                  </div>
                </div>
              ))}
              {recentReleases.length === 0 && (
                <div className="px-4 py-3 text-xs text-white/25">No releases.</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent songs */}
        <div>
          <SectionHead title="Recently Updated Songs" />
          <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {recentSongs.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{s.title}</p>
                    <p className="text-[10px] text-white/30">{s.artistName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.isrc && (
                      <span className="text-[9px] text-sky-400/60 border border-sky-500/20 px-1 rounded">ISRC</span>
                    )}
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[s.status]}`} />
                  </div>
                </div>
              ))}
              {recentSongs.length === 0 && (
                <div className="px-4 py-3 text-xs text-white/25">No songs.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
