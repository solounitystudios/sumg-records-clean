import Link from "next/link"
import { getReleases } from "@/lib/db/releases"
import { formatStreams } from "@/lib/data"
import { archiveRelease, restoreRelease } from "@/app/actions/releases"

export const metadata = { title: "Release Command Center — SUMG Admin" }

const statusStyle: Record<string, string> = {
  published: "bg-emerald-500/12 text-emerald-400 border-emerald-500/20",
  scheduled: "bg-amber-500/12 text-amber-400 border-amber-500/20",
  draft:     "bg-white/5 text-white/35 border-white/10",
  archived:  "bg-white/3 text-white/25 border-white/8",
}

const statusAccent: Record<string, string> = {
  published: "border-l-emerald-500/50",
  scheduled: "border-l-amber-500/50",
  draft:     "border-l-white/15",
  archived:  "border-l-white/10",
}

export default async function ReleasesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; artist?: string }>
}) {
  const [{ status: filterStatus, artist: filterArtist }, allReleases] = await Promise.all([
    searchParams,
    getReleases(),
  ])

  const byStatus = {
    published: allReleases.filter((r) => r.status === "published"),
    scheduled: allReleases.filter((r) => r.status === "scheduled"),
    draft:     allReleases.filter((r) => r.status === "draft"),
    archived:  allReleases.filter((r) => r.status === "archived"),
  }

  const totalPublishedStreams = byStatus.published.reduce((s, r) => s + r.streams, 0)

  let releases = [...allReleases]
  if (filterStatus) releases = releases.filter((r) => r.status === filterStatus)
  if (filterArtist) releases = releases.filter((r) => r.artistSlug === filterArtist)

  const sorted = releases.sort((a, b) => {
    const order: Record<string, number> = { published: 0, scheduled: 1, draft: 2, archived: 3 }
    return (order[a.status] ?? 9) - (order[b.status] ?? 9)
  })

  const isFiltered = !!(filterStatus || filterArtist)

  return (
    <main className="px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / Catalog</p>
          <h1 className="text-3xl font-semibold tracking-tight">Release Command Center</h1>
          <p className="mt-2 text-sm text-white/40">
            {isFiltered ? (
              <>
                {filterStatus && <span className="text-white/60">{filterStatus}</span>}
                {filterArtist && <span> · <span className="text-white/60">{filterArtist}</span></span>}
                {" "}
                <Link href="/admin/releases" className="text-white/30 hover:text-white/60 transition-colors duration-150 underline underline-offset-2">
                  Clear filter
                </Link>
              </>
            ) : "Manage all SUMG releases across the roster."}
          </p>
        </div>
        <Link
          href="/admin/releases/new"
          className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-medium text-black hover:bg-white/90 transition-all duration-150"
        >
          + New Release
        </Link>
      </div>

      {/* Clickable workflow KPIs */}
      <div className="grid gap-3 sm:grid-cols-4 mb-8">
        {(["published", "scheduled", "draft", "archived"] as const).map((status) => (
          <Link
            key={status}
            href={`/admin/releases?status=${status}`}
            className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-150 ${
              filterStatus === status
                ? "border-white/20 bg-white/[0.06]"
                : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
            }`}
          >
            <div className={`absolute inset-y-0 left-0 w-[2px] rounded-l-2xl ${statusAccent[status]}`} />
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/30 mb-2 font-mono">{status}</div>
            <div className="text-2xl font-semibold tabular-nums font-mono">{byStatus[status].length}</div>
            {filterStatus === status && <div className="absolute top-3 right-3 h-1 w-1 rounded-full bg-white/40" />}
          </Link>
        ))}
      </div>

      {/* Streams banner */}
      <div className="mb-8 rounded-2xl border border-white/[0.08] bg-[#0a0c10] p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/25 mb-1 font-mono">Published Catalog Streams</div>
            <div className="text-2xl font-semibold tabular-nums font-mono">{formatStreams(totalPublishedStreams)}</div>
            <div className="text-[9px] text-amber-400/50 mt-1 font-mono">⚠ manually set · not synced from DSP</div>
          </div>
          <Link
            href="/admin/imports"
            className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25 hover:text-white/60 border border-white/[0.08] hover:border-white/20 px-3 py-2 rounded transition-all duration-150"
          >
            Import Streams →
          </Link>
        </div>
      </div>

      {/* Release cards */}
      <div className="space-y-3">
        {sorted.map((release) => {
          const isArchived    = release.status === "archived"
          const archiveAction = archiveRelease.bind(null, release.slug)
          const restoreAction = restoreRelease.bind(null, release.slug)

          return (
            <div
              key={release.id}
              className={`rounded-2xl border overflow-hidden transition-all duration-150 ${
                isArchived
                  ? "border-white/[0.04] bg-[#0a0c10]/50 opacity-55"
                  : "border-white/[0.08] bg-[#0a0c10] hover:border-white/[0.13]"
              }`}
            >
              <div className="flex items-start gap-5 p-5">
                <div
                  className="shrink-0 w-14 h-14 rounded-xl transition-transform duration-150 group-hover:scale-105"
                  style={{
                    background: `radial-gradient(circle at top, ${release.accentColor}44, ${release.accentColor}11)`,
                    border: `1px solid ${release.accentColor}44`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-base font-semibold">{release.title}</h3>
                      <p className="text-xs text-white/40 mt-0.5 font-mono">
                        {release.artistName} · {release.type.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <span className={`text-[9px] border px-2 py-0.5 rounded-full font-mono ${statusStyle[release.status] ?? statusStyle.draft}`}>
                        {release.status}
                      </span>
                      <Link
                        href={`/admin/releases/${release.slug}/edit`}
                        className="text-[10px] font-mono text-white/30 hover:text-white transition-colors duration-150 border border-white/[0.08] hover:border-white/20 px-2.5 py-1 rounded"
                      >
                        Edit
                      </Link>
                      {!isArchived && release.status === "published" && (
                        <Link
                          href={`/releases/${release.slug}`}
                          className="text-[10px] font-mono text-white/25 hover:text-white transition-colors duration-150"
                        >
                          Public →
                        </Link>
                      )}
                      {isArchived ? (
                        <form action={restoreAction}>
                          <button type="submit" className="text-[10px] font-mono text-emerald-400/60 hover:text-emerald-400 transition-colors duration-150">
                            Restore
                          </button>
                        </form>
                      ) : (
                        <form action={archiveAction}>
                          <button type="submit" className="text-[10px] font-mono text-red-400/40 hover:text-red-400 transition-colors duration-150">
                            Archive
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-4">
                    {[
                      { label: "Release Date", value: release.releaseDate },
                      { label: "Tracks", value: release.tracks.length },
                      { label: "Streams", value: release.status === "published" ? formatStreams(release.streams) : "—", note: "manual" },
                      { label: "Platforms", value: release.platforms.length > 0 ? release.platforms.length : "—" },
                    ].map(({ label, value, note }) => (
                      <div key={label}>
                        <div className="text-[9px] text-white/25 uppercase tracking-[0.15em] mb-1 font-mono">
                          {label}
                          {note && <span className="ml-1 text-amber-400/40 normal-case tracking-normal">· {note}</span>}
                        </div>
                        <div className="text-sm font-mono tabular-nums text-white/70">{value}</div>
                      </div>
                    ))}
                  </div>

                  {release.tracks.length > 0 && (
                    <details className="mt-4">
                      <summary className="text-[10px] font-mono text-white/30 hover:text-white/60 cursor-pointer transition-colors duration-150 select-none tracking-wider">
                        TRACK LISTING ({release.tracks.length})
                      </summary>
                      <div className="mt-3 space-y-1">
                        {release.tracks.map((track) => (
                          <div key={track.number} className="flex items-center gap-4 text-xs">
                            <span className="text-white/20 w-4 text-right font-mono">{track.number}</span>
                            <span className="flex-1 text-white/65">{track.title}</span>
                            <span className="text-white/30 font-mono">{track.duration}</span>
                            {release.status === "published" && (
                              <span className="text-white/30 w-12 text-right font-mono tabular-nums">{formatStreams(track.streams)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {release.platforms.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {release.platforms.map((p) => (
                        <span key={p} className="text-[9px] px-2 py-0.5 rounded-full border border-white/[0.08] text-white/35 font-mono">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {sorted.length === 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-10 text-center">
            <p className="text-sm text-white/25 font-mono">No {filterStatus ?? ""} releases.</p>
          </div>
        )}
      </div>
    </main>
  )
}
