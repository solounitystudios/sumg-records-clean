import Link from "next/link"
import { getReleases } from "@/lib/db/releases"
import { formatStreams } from "@/lib/data"
import { archiveRelease, restoreRelease } from "@/app/actions/releases"

export const metadata = { title: "Release Command Center — SUMG Admin" }

const statusStyle: Record<string, string> = {
  published: "bg-emerald-500/15 text-emerald-400",
  scheduled:  "bg-amber-500/15 text-amber-400",
  draft:      "bg-white/8 text-white/35",
  archived:   "bg-white/5 text-white/25",
}

export default async function ReleasesAdminPage() {
  const releases = await getReleases()
  const byStatus = {
    published: releases.filter((r) => r.status === "published"),
    scheduled:  releases.filter((r) => r.status === "scheduled"),
    draft:      releases.filter((r) => r.status === "draft"),
    archived:   releases.filter((r) => r.status === "archived"),
  }

  const totalPublishedStreams = byStatus.published.reduce((s, r) => s + r.streams, 0)

  const sorted = [...releases].sort((a, b) => {
    const order: Record<string, number> = { published: 0, scheduled: 1, draft: 2, archived: 3 }
    return (order[a.status] ?? 9) - (order[b.status] ?? 9)
  })

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Release Command Center</h1>
        <p className="mt-2 text-sm text-white/50">Manage all SUMG releases across the roster.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-10">
        {(["published", "scheduled", "draft", "archived"] as const).map((status) => (
          <div key={status} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{status}</div>
            <div className="text-2xl font-semibold">{byStatus[status].length}</div>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-[#0d1016] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-0.5">Published Catalog Streams</div>
            <div className="text-2xl font-semibold">{formatStreams(totalPublishedStreams)}</div>
            <div className="text-[10px] text-amber-400/60 mt-1">⚠ manually set · not synced from DSP</div>
          </div>
          <Link
            href="/admin/releases/new"
            className="rounded-full border border-white/20 px-5 py-2 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white transition"
          >
            + New Release
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map((release) => {
          const isArchived = release.status === "archived"
          const archiveAction = archiveRelease.bind(null, release.slug)
          const restoreAction = restoreRelease.bind(null, release.slug)

          return (
            <div
              key={release.id}
              className={`rounded-2xl border overflow-hidden ${
                isArchived ? "border-white/5 bg-[#0d1016]/50 opacity-60" : "border-white/10 bg-[#0d1016]"
              }`}
            >
              <div className="flex items-start gap-5 p-5">
                <div
                  className="shrink-0 w-14 h-14 rounded-xl"
                  style={{
                    background: `radial-gradient(circle at top, ${release.accentColor}44, ${release.accentColor}11)`,
                    border: `1px solid ${release.accentColor}44`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-base font-semibold">{release.title}</h3>
                      <p className="text-sm text-white/50 mt-0.5">
                        {release.artistName} · {release.type.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusStyle[release.status] ?? statusStyle.draft}`}>
                        {release.status}
                      </span>
                      <Link
                        href={`/admin/releases/${release.slug}/edit`}
                        className="text-xs text-white/40 hover:text-white transition"
                      >
                        Edit
                      </Link>
                      {!isArchived && release.status === "published" && (
                        <Link
                          href={`/releases/${release.slug}`}
                          className="text-xs text-white/40 hover:text-white transition"
                        >
                          Public →
                        </Link>
                      )}
                      {isArchived ? (
                        <form action={restoreAction}>
                          <button type="submit" className="text-xs text-emerald-400/70 hover:text-emerald-400 transition">
                            Restore
                          </button>
                        </form>
                      ) : (
                        <form action={archiveAction}>
                          <button type="submit" className="text-xs text-red-400/50 hover:text-red-400 transition">
                            Archive
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-4 text-sm">
                    <div>
                      <div className="text-xs text-white/35 uppercase tracking-[0.15em] mb-1">Release Date</div>
                      <div>{release.releaseDate}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/35 uppercase tracking-[0.15em] mb-1">Tracks</div>
                      <div>{release.tracks.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/35 uppercase tracking-[0.15em] mb-1">
                        Streams <span className="text-amber-400/50 normal-case tracking-normal">· manual</span>
                      </div>
                      <div title="Manually set — not synced from DSP">
                        {release.status === "published" ? formatStreams(release.streams) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-white/35 uppercase tracking-[0.15em] mb-1">Platforms</div>
                      <div>{release.platforms.length > 0 ? release.platforms.length : "—"}</div>
                    </div>
                  </div>

                  {release.tracks.length > 0 && (
                    <details className="mt-4">
                      <summary className="text-xs text-white/40 hover:text-white cursor-pointer transition select-none">
                        Track listing ({release.tracks.length})
                      </summary>
                      <div className="mt-3 space-y-1.5">
                        {release.tracks.map((track) => (
                          <div key={track.number} className="flex items-center gap-4 text-xs">
                            <span className="text-white/25 w-4 text-right">{track.number}</span>
                            <span className="flex-1 text-white/70">{track.title}</span>
                            <span className="text-white/35">{track.duration}</span>
                            {release.status === "published" && (
                              <span className="text-white/35 w-12 text-right">{formatStreams(track.streams)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {release.platforms.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {release.platforms.map((p) => (
                        <span
                          key={p}
                          className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/40"
                        >
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
      </div>
    </main>
  )
}
