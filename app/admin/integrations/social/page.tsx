import Link from "next/link"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Social Integrations — SUMG Admin" }

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

export default async function SocialIntegrationsPage() {
  await requireAdmin()

  const instagramConnected = isSet(process.env.INSTAGRAM_ACCESS_TOKEN)
  const tiktokConnected    = isSet(process.env.TIKTOK_CLIENT_KEY) && isSet(process.env.TIKTOK_CLIENT_SECRET)
  const xConnected         = isSet(process.env.X_BEARER_TOKEN)
  const facebookConnected  = isSet(process.env.FACEBOOK_PAGE_ACCESS_TOKEN)

  const integrations: IntegrationStatus[] = [
    {
      name: "Instagram",
      connected: instagramConnected,
      detail: instagramConnected
        ? "Graph API connected. Profile metrics, recent posts, and audience insights available."
        : "Set INSTAGRAM_ACCESS_TOKEN. Requires a Business or Creator account linked to a Facebook Page.",
      envKeys: ["INSTAGRAM_ACCESS_TOKEN"],
      manageHref: "https://developers.facebook.com/apps",
      manageLabel: "Meta for Developers",
    },
    {
      name: "TikTok",
      connected: tiktokConnected,
      detail: tiktokConnected
        ? "TikTok for Developers connected. Profile and video metrics available via OAuth."
        : "Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to enable TikTok metrics and posting.",
      envKeys: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
      manageHref: "https://developers.tiktok.com/apps",
      manageLabel: "TikTok for Developers",
    },
    {
      name: "X (Twitter)",
      connected: xConnected,
      detail: xConnected
        ? "X API v2 bearer token configured. Read-only metrics and tweet posting available."
        : "Set X_BEARER_TOKEN to enable read access. Posting requires OAuth1.0a or OAuth2 user context.",
      envKeys: ["X_BEARER_TOKEN"],
      manageHref: "https://developer.x.com/portal/dashboard",
      manageLabel: "X Developer Portal",
    },
    {
      name: "Facebook",
      connected: facebookConnected,
      detail: facebookConnected
        ? "Page access token configured. Page posting and Insights API available."
        : "Set FACEBOOK_PAGE_ACCESS_TOKEN for a Page you administer.",
      envKeys: ["FACEBOOK_PAGE_ACCESS_TOKEN"],
      manageHref: "https://developers.facebook.com/apps",
      manageLabel: "Meta for Developers",
    },
    {
      name: "Threads",
      connected: false,
      detail: "Threads API is in limited rollout. Cross-posting handled via Instagram for now.",
    },
    {
      name: "Bluesky",
      connected: false,
      detail: "AT Protocol publishing planned. No keys required for basic read; app password for posting.",
    },
  ]

  const connectedCount = integrations.filter((i) => i.connected).length

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / Integrations</p>
          <h1 className="text-3xl font-semibold tracking-tight">Social Platforms</h1>
          <p className="mt-2 text-sm text-white/40">
            {connectedCount} of {integrations.length} connected · Audience metrics and cross-posting.
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
                <div className="flex flex-wrap gap-1.5">
                  {i.envKeys.map((k) => (
                    <code key={k} className="text-[10px] font-mono text-white/40 bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5">
                      {k}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-white/[0.06] border-dashed bg-white/[0.01] px-5 py-4">
        <p className="text-xs text-white/35 leading-relaxed">
          <span className="text-white/55">Cross-posting</span> — once 2+ platforms are connected, you&apos;ll be able to schedule posts from a single composer in{" "}
          <Link href="/admin/social" className="text-violet-400/70 hover:text-violet-300 transition-colors duration-150">Social Accounts</Link>.
        </p>
      </div>
    </main>
  )
}
