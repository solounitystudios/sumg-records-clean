import Link from "next/link"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Music Integrations — SUMG Admin" }

interface IntegrationStatus {
  name: string
  connected: boolean
  detail: string
  envKeys?: string[]
  manageHref?: string
  manageLabel?: string
  internalHref?: string
  internalLabel?: string
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${ok ? "bg-emerald-500" : "bg-white/15"}`} />
}

function isSet(v: string | undefined) {
  return typeof v === "string" && v.trim().length > 0
}

export default async function MusicIntegrationsPage() {
  await requireAdmin()

  const spotifyConnected = isSet(process.env.SPOTIFY_CLIENT_ID) && isSet(process.env.SPOTIFY_CLIENT_SECRET)
  const appleConnected   = isSet(process.env.APPLE_MUSIC_TEAM_ID) && isSet(process.env.APPLE_MUSIC_KEY_ID) && isSet(process.env.APPLE_MUSIC_PRIVATE_KEY)
  const youtubeConnected = isSet(process.env.YOUTUBE_CLIENT_ID) && isSet(process.env.YOUTUBE_CLIENT_SECRET)

  const integrations: IntegrationStatus[] = [
    {
      name: "Spotify",
      connected: spotifyConnected,
      detail: spotifyConnected
        ? "Client Credentials flow active. Artist data, top tracks, and audio features available."
        : "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to enable artist metrics.",
      envKeys: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
      manageHref: "https://developer.spotify.com/dashboard",
      manageLabel: "Developer Console",
      internalHref: "/admin/spotify",
      internalLabel: "Open Spotify panel",
    },
    {
      name: "Apple Music",
      connected: appleConnected,
      detail: appleConnected
        ? "MusicKit JWT signing configured. Catalog and chart data available."
        : "Set APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, and APPLE_MUSIC_PRIVATE_KEY for catalog access.",
      envKeys: ["APPLE_MUSIC_TEAM_ID", "APPLE_MUSIC_KEY_ID", "APPLE_MUSIC_PRIVATE_KEY"],
      manageHref: "https://developer.apple.com/account/resources/authkeys/list",
      manageLabel: "Apple Developer",
      internalHref: "/admin/apple-music",
      internalLabel: "Open Apple Music panel",
    },
    {
      name: "YouTube",
      connected: youtubeConnected,
      detail: youtubeConnected
        ? "OAuth client configured. Channel uploads, metadata, and analytics available."
        : "Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET, then connect channels via OAuth.",
      envKeys: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
      manageHref: "https://console.cloud.google.com/apis/credentials",
      manageLabel: "Google Cloud Console",
      internalHref: "/admin/youtube",
      internalLabel: "Open YouTube control center",
    },
    {
      name: "DistroKid",
      connected: false,
      detail: "No public API. Catalog data is imported manually via TSV exports.",
      internalHref: "/admin/imports",
      internalLabel: "Open Imports",
    },
    {
      name: "BMI",
      connected: false,
      detail: "No public API. Composer credits and royalty statements imported via CSV.",
      internalHref: "/admin/imports",
      internalLabel: "Open Imports",
    },
    {
      name: "SoundExchange",
      connected: false,
      detail: "No public API. Performance royalties imported via CSV.",
      internalHref: "/admin/imports",
      internalLabel: "Open Imports",
    },
  ]

  const connectedCount = integrations.filter((i) => i.connected).length

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / Integrations</p>
          <h1 className="text-3xl font-semibold tracking-tight">Music Platforms</h1>
          <p className="mt-2 text-sm text-white/40">
            {connectedCount} of {integrations.length} connected · Streaming, distribution, and rights organizations.
          </p>
        </div>
        <Link href="/admin/settings" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">← Settings</Link>
      </div>

      <div className="space-y-3">
        {integrations.map((i) => (
          <div key={i.name} className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusDot ok={i.connected} />
                <h2 className="text-sm font-medium text-white/85">{i.name}</h2>
                <span className={`text-[9px] tracking-[0.15em] uppercase font-mono ${i.connected ? "text-emerald-400/70" : "text-white/25"}`}>
                  {i.connected ? "connected" : "not configured"}
                </span>
              </div>
              {i.manageHref && (
                <a
                  href={i.manageHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150"
                >
                  {i.manageLabel} →
                </a>
              )}
            </div>
            <div className="px-6 py-4">
              <p className="text-xs text-white/45 leading-relaxed mb-3">{i.detail}</p>
              {i.envKeys && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {i.envKeys.map((k) => (
                    <code key={k} className="text-[10px] font-mono text-white/40 bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5">
                      {k}
                    </code>
                  ))}
                </div>
              )}
              {i.internalHref && (
                <Link href={i.internalHref} className="text-xs text-violet-400/70 hover:text-violet-300 transition-colors duration-150">
                  {i.internalLabel} →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
