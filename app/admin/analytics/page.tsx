import { Suspense } from "react"
import { getArtists } from "@/lib/db/artists"
import { getReleases } from "@/lib/db/releases"
import { getRoyalties } from "@/lib/db/royalties"
import { getNews } from "@/lib/db/news"
import { formatStreams, formatRevenue } from "@/lib/data"
import { getArtistSpotifySnapshots } from "@/lib/cms"

export const metadata = { title: "Analytics — SUMG Admin" }

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({
  source,
}: {
  source: "db" | "spotify-api" | "placeholder"
}) {
  const styles = {
    "db":           "bg-sky-500/10 text-sky-400/80 border-sky-500/20",
    "spotify-api":  "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20",
    "placeholder":  "bg-white/5 text-white/25 border-white/10",
  }
  const labels = {
    "db":          "■ Supabase DB",
    "spotify-api": "◉ Spotify API",
    "placeholder": "◌ Placeholder",
  }
  return (
    <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full border ${styles[source]}`}>
      {labels[source]}
    </span>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  source,
}: {
  title: string
  source: "db" | "spotify-api" | "placeholder"
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">{title}</h2>
      <SourceBadge source={source} />
    </div>
  )
}

// ─── Spotify snapshot row (async) ─────────────────────────────────────────────

async function SpotifySnapshotRow({
  artistSlug,
  artistName,
  genre,
}: {
  artistSlug: string
  artistName: string
  genre: string
}) {
  const snapshots = await getArtistSpotifySnapshots(artistSlug).catch(() => [])
  const [latest, previous] = snapshots
  if (!latest) return null

  const trend = previous ? latest.followers - previous.followers : null

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-sm font-medium">{artistName}</p>
        <p className="text-xs text-white/35">{genre}</p>
      </div>
      <div className="flex items-center gap-6 text-right">
        <div>
          <p className="text-sm font-medium tabular-nums">
            {latest.followers >= 1_000_000
              ? `${(latest.followers / 1_000_000).toFixed(1)}M`
              : latest.followers >= 1_000
              ? `${Math.round(latest.followers / 1_000)}K`
              : latest.followers}
          </p>
          <p className="text-xs text-white/30">followers</p>
        </div>
        <div>
          <p className="text-sm font-medium tabular-nums">{latest.popularity}</p>
          <p className="text-xs text-white/30">popularity</p>
        </div>
        {trend !== null && (
          <div>
            <p className={`text-sm font-medium tabular-nums ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {trend >= 0 ? "+" : ""}
              {trend >= 1_000 ? `${Math.round(trend / 1_000)}K` : trend}
            </p>
            <p className="text-xs text-white/30">δ followers</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const [artists, releases, royalties, news] = await Promise.all([
    getArtists(),
    getReleases(),
    getRoyalties(),
    getNews(),
  ])

  // ── Overview numbers ─────────────────────────────────────────────────
  const totalStreams        = artists.reduce((s, a) => s + a.totalStreams, 0)
  const totalMonthly        = artists.reduce((s, a) => s + a.monthlyListeners, 0)
  const liveReleases        = releases.filter((r) => r.status === "live")
  const linkedToSpotify     = artists.filter((a) => !!a.spotifyId)

  const q1 = royalties.filter((r) => r.period === "2026-Q1")
  const q4 = royalties.filter((r) => r.period === "2025-Q4")
  const q1Revenue  = q1.reduce((s, r) => s + r.revenue, 0)
  const q4Revenue  = q4.reduce((s, r) => s + r.revenue, 0)
  const qoqGrowth  = q4Revenue > 0
    ? (((q1Revenue - q4Revenue) / q4Revenue) * 100).toFixed(1)
    : null
  const q1Streams  = q1.reduce((s, r) => s + r.streams, 0)

  // ── Top artists by stream count ───────────────────────────────────────
  const topArtists = [...artists]
    .sort((a, b) => b.totalStreams - a.totalStreams)

  // ── Top releases by stream count ──────────────────────────────────────
  const topReleases = [...releases]
    .filter((r) => r.status === "live")
    .sort((a, b) => b.streams - a.streams)
    .slice(0, 8)
  const maxReleaseStreams = topReleases[0]?.streams ?? 1

  // ── Top tracks aggregated from all live release tracklists ────────────
  type TrackRow = {
    title: string
    artistName: string
    releaseTitle: string
    releaseSlug: string
    streams: number
    duration: string
  }
  const allTracks: TrackRow[] = releases
    .filter((r) => r.status === "live")
    .flatMap((r) =>
      r.tracks.map((t) => ({
        title: t.title,
        artistName: r.artistName,
        releaseTitle: r.title,
        releaseSlug: r.slug,
        streams: t.streams,
        duration: t.duration,
      }))
    )
    .sort((a, b) => b.streams - a.streams)
    .slice(0, 10)
  const maxTrackStreams = allTracks[0]?.streams ?? 1

  // ── Platform breakdown from royalties ─────────────────────────────────
  const platformTotals: Record<string, { streams: number; revenue: number }> = {}
  q1.forEach((rec) => {
    rec.platforms.forEach(({ platform, streams, revenue }) => {
      if (!platformTotals[platform]) platformTotals[platform] = { streams: 0, revenue: 0 }
      platformTotals[platform].streams += streams
      platformTotals[platform].revenue += revenue
    })
  })
  const platformList = Object.entries(platformTotals).sort(
    (a, b) => b[1].revenue - a[1].revenue
  )
  const maxPlatformRevenue = platformList[0]?.[1].revenue ?? 1

  // ── Spotify-linked artists ────────────────────────────────────────────
  const linkedArtists = artists.filter((a) => !!a.spotifyId)

  return (
    <main className="px-6 py-10 md:px-10 max-w-6xl">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Analytics</h1>
        <p className="mt-2 text-sm text-white/50">
          Catalog performance, revenue, and platform intelligence.
        </p>
      </div>

      {/* ── Overview Cards ── */}
      <section className="mb-10">
        <SectionHeader title="Overview" source="db" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Total Streams",       value: formatStreams(totalStreams),    sub: "All artists · all-time" },
            { label: "Monthly Listeners",   value: formatStreams(totalMonthly),   sub: "Active listeners" },
            { label: "Q1 2026 Revenue",     value: formatRevenue(q1Revenue),      sub: "Distributed royalties" },
            {
              label: "QoQ Growth",
              value: qoqGrowth ? `${qoqGrowth}%` : "—",
              sub: "Revenue vs Q4 2025",
              accent: qoqGrowth ? (parseFloat(qoqGrowth) >= 0 ? "text-emerald-400" : "text-red-400") : "",
            },
            { label: "Live Releases",       value: liveReleases.length.toString(),  sub: `${releases.length} total in catalog` },
            { label: "Roster",              value: artists.length.toString(),        sub: `${linkedToSpotify.length} linked to Spotify` },
          ].map(({ label, value, sub, accent }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
              <div className={`text-2xl font-semibold ${accent ?? ""}`}>{value}</div>
              <div className="mt-1 text-xs text-white/30">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top Artists + Platform Breakdown ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] mb-10">

        {/* Top Artists */}
        <section>
          <SectionHeader title="Top Artists — by Total Streams" source="db" />
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] divide-y divide-white/[0.04]">
            {topArtists.map((artist) => {
              const share = totalStreams > 0
                ? ((artist.totalStreams / totalStreams) * 100).toFixed(1)
                : "0.0"
              return (
                <div key={artist.slug} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-sm font-medium">{artist.name}</p>
                      <p className="text-xs text-white/35">{artist.genre} · {artist.role}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium tabular-nums">{formatStreams(artist.totalStreams)}</p>
                      <p className="text-xs text-white/30">{formatStreams(artist.monthlyListeners)}/mo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/[0.05] rounded-full h-1">
                      <div
                        className="bg-sky-400 h-1 rounded-full"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/25 tabular-nums w-10 text-right shrink-0">
                      {share}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Platform Breakdown */}
        <section>
          <SectionHeader title="Platform Revenue — Q1 2026" source="db" />
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-5">
            {platformList.length === 0 ? (
              <p className="text-xs text-white/30">No platform data for Q1 2026.</p>
            ) : (
              <div className="space-y-4">
                {platformList.map(([platform, data]) => (
                  <div key={platform}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-white/60 font-medium">{platform}</span>
                      <span className="text-white/80 tabular-nums">{formatRevenue(data.revenue)}</span>
                    </div>
                    <div className="w-full bg-white/[0.05] rounded-full h-1.5 mb-1">
                      <div
                        className="bg-violet-400 h-1.5 rounded-full"
                        style={{ width: `${(data.revenue / maxPlatformRevenue) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-white/25 tabular-nums">
                      {formatStreams(data.streams)} streams
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Q1 vs Q4 comparison */}
            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <p className="text-xs uppercase tracking-[0.15em] text-white/25 mb-3">Period</p>
              {[
                { label: "Q1 2026", revenue: q1Revenue, streams: q1Streams },
                { label: "Q4 2025", revenue: q4Revenue, streams: q4.reduce((s, r) => s + r.streams, 0) },
              ].map(({ label, revenue, streams }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs text-white/50">{label}</span>
                  <div className="text-right">
                    <p className="text-xs font-medium tabular-nums">{formatRevenue(revenue)}</p>
                    <p className="text-[10px] text-white/25 tabular-nums">{formatStreams(streams)} streams</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Top Releases ── */}
      <section className="mb-10">
        <SectionHeader title="Top Releases — by Streams" source="db" />
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {topReleases.map((release, i) => (
              <div key={release.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="text-xs text-white/20 tabular-nums w-4 shrink-0">{i + 1}</span>
                <div
                  className="shrink-0 w-8 h-8 rounded-lg"
                  style={{
                    background: `radial-gradient(circle at top, ${release.accentColor}44, ${release.accentColor}11)`,
                    border: `1px solid ${release.accentColor}33`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{release.title}</p>
                      <p className="text-xs text-white/35 truncate">{release.artistName} · {release.type}</p>
                    </div>
                    <p className="text-sm font-medium tabular-nums shrink-0">{formatStreams(release.streams)}</p>
                  </div>
                  <div className="w-full bg-white/[0.05] rounded-full h-1">
                    <div
                      className="bg-emerald-400/70 h-1 rounded-full"
                      style={{ width: `${(release.streams / maxReleaseStreams) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {topReleases.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-white/30">
                No live releases.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Top Tracks ── */}
      <section className="mb-10">
        <SectionHeader title="Top Songs — by Streams" source="db" />
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          {allTracks.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {allTracks.map((track, i) => (
                <div key={`${track.releaseSlug}-${track.title}`} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-xs text-white/20 tabular-nums w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        <p className="text-xs text-white/35 truncate">
                          {track.artistName} · {track.releaseTitle} · {track.duration}
                        </p>
                      </div>
                      <p className="text-sm font-medium tabular-nums shrink-0">
                        {formatStreams(track.streams)}
                      </p>
                    </div>
                    <div className="w-full bg-white/[0.05] rounded-full h-1">
                      <div
                        className="bg-violet-400/70 h-1 rounded-full"
                        style={{ width: `${(track.streams / maxTrackStreams) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-white/30">
              No track data. Tracklists are pulled from live releases.
            </div>
          )}
        </div>
      </section>

      {/* ── Spotify Metrics ── */}
      <section className="mb-10">
        <SectionHeader title="Spotify Metrics" source="spotify-api" />
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-xs text-white/40">
              {linkedArtists.length} of {artists.length} artists linked to Spotify
            </p>
            <a
              href="/admin/spotify"
              className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150"
            >
              Manage Spotify →
            </a>
          </div>

          {linkedArtists.length > 0 ? (
            <div className="px-5 divide-y divide-white/[0.04]">
              <Suspense
                fallback={
                  <div className="py-6 text-xs text-white/25 text-center">
                    Loading Spotify snapshots…
                  </div>
                }
              >
                {linkedArtists.map((artist) => (
                  <SpotifySnapshotRow
                    key={artist.slug}
                    artistSlug={artist.slug}
                    artistName={artist.name}
                    genre={artist.genre}
                  />
                ))}
              </Suspense>
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-white/30">
              No artists linked to Spotify yet.{" "}
              <a href="/admin/spotify" className="text-white/50 underline">
                Link artists →
              </a>
            </div>
          )}

          <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01]">
            <p className="text-xs text-white/25">
              Follower counts from stored snapshots. Refresh via the{" "}
              <a href="/admin/spotify" className="text-white/40 underline">Spotify Intelligence</a>{" "}
              panel.
            </p>
          </div>
        </div>
      </section>

      {/* ── Content Summary ── */}
      <section className="mb-10">
        <SectionHeader title="Content Summary" source="db" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "News Items",    value: news.length,                                  sub: `${news.filter((n) => n.featured).length} featured` },
            { label: "Tracks",        value: releases.flatMap((r) => r.tracks).length,     sub: "Across all releases" },
            { label: "Release Types", value: [...new Set(releases.map((r) => r.type))].length, sub: releases.filter((r) => r.type === "single").length + " singles" },
            { label: "Avg Streams",   value: formatStreams(Math.round(totalStreams / Math.max(artists.length, 1))), sub: "Per artist" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1.5">{label}</p>
              <p className="text-xl font-semibold">{value}</p>
              <p className="text-xs text-white/25 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Placeholder Sections ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Coming Soon</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Web Traffic",
              desc: "Page views, unique visitors, bounce rate, referral sources.",
              note: "Requires analytics integration (Plausible, Fathom, or GA4).",
              badge: "◌ Placeholder",
            },
            {
              label: "YouTube",
              desc: "Channel views, subscriber growth, video performance.",
              note: "Requires YouTube Data API credentials.",
              badge: "◌ Placeholder",
            },
            {
              label: "Publishing / PRO",
              desc: "BMI / ASCAP registration status, sync licensing, mechanical royalties.",
              note: "No public real-time API — requires manual data entry.",
              badge: "◌ Placeholder",
            },
            {
              label: "Commerce",
              desc: "Shopify orders, revenue, product performance.",
              note: "Configure SHOPIFY_ADMIN_ACCESS_TOKEN to enable.",
              badge: "◌ Placeholder",
            },
            {
              label: "Distribution",
              desc: "DistroKid delivery status, UPC tracking, DSP coverage.",
              note: "No public API — manual sync required.",
              badge: "◌ Placeholder",
            },
            {
              label: "Apple Music",
              desc: "Listener counts, Shazam data, editorial placement.",
              note: "Requires Apple Music for Artists developer token.",
              badge: "◌ Placeholder",
            },
          ].map(({ label, desc, note, badge }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/[0.07] border-dashed bg-white/[0.01] p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-medium text-white/50">{label}</p>
                <span className="text-[9px] tracking-[0.12em] uppercase text-white/20 border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                  {badge}
                </span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed mb-2">{desc}</p>
              <p className="text-[10px] text-white/20 leading-relaxed italic">{note}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
