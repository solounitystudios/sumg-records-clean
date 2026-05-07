import Link from "next/link"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "AI Integrations — SUMG Admin" }

interface IntegrationStatus {
  name: string
  connected: boolean
  detail: string
  envKeys?: string[]
  manageHref?: string
  manageLabel?: string
  uses: string[]
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${ok ? "bg-emerald-500" : "bg-white/15"}`} />
}

function isSet(v: string | undefined) {
  return typeof v === "string" && v.trim().length > 0
}

export default async function AIIntegrationsPage() {
  await requireAdmin()

  const anthropicConnected = isSet(process.env.ANTHROPIC_API_KEY)
  const openaiConnected    = isSet(process.env.OPENAI_API_KEY)
  const replicateConnected = isSet(process.env.REPLICATE_API_TOKEN)
  const elevenConnected    = isSet(process.env.ELEVENLABS_API_KEY)

  const integrations: IntegrationStatus[] = [
    {
      name: "Anthropic (Claude)",
      connected: anthropicConnected,
      detail: anthropicConnected
        ? "Claude API connected. Used for lyric analysis, persona profiling, and admin copilots."
        : "Set ANTHROPIC_API_KEY to enable Claude-powered features.",
      envKeys: ["ANTHROPIC_API_KEY"],
      manageHref: "https://console.anthropic.com",
      manageLabel: "Anthropic Console",
      uses: ["Lyric drafts", "Persona profiles", "Title optimization"],
    },
    {
      name: "OpenAI",
      connected: openaiConnected,
      detail: openaiConnected
        ? "OpenAI API connected. Used for thumbnail enhancement, embeddings, and metadata enrichment."
        : "Set OPENAI_API_KEY to enable OpenAI-powered features.",
      envKeys: ["OPENAI_API_KEY"],
      manageHref: "https://platform.openai.com",
      manageLabel: "OpenAI Platform",
      uses: ["Thumbnail prompts", "DALL·E generation", "Embeddings"],
    },
    {
      name: "Replicate",
      connected: replicateConnected,
      detail: replicateConnected
        ? "Replicate connected. Used for image generation models (SDXL, Flux) and stem separation."
        : "Set REPLICATE_API_TOKEN to enable image generation pipelines.",
      envKeys: ["REPLICATE_API_TOKEN"],
      manageHref: "https://replicate.com/account/api-tokens",
      manageLabel: "Replicate API",
      uses: ["Cover art", "Thumbnail generation", "Stems"],
    },
    {
      name: "ElevenLabs",
      connected: elevenConnected,
      detail: elevenConnected
        ? "ElevenLabs connected. Used for voice cloning, TTS, and audio cleanup."
        : "Set ELEVENLABS_API_KEY to enable voice synthesis features.",
      envKeys: ["ELEVENLABS_API_KEY"],
      manageHref: "https://elevenlabs.io/app/settings/api-keys",
      manageLabel: "ElevenLabs Settings",
      uses: ["Voice IDs", "Narration", "Audio cleanup"],
    },
  ]

  const connectedCount = integrations.filter((i) => i.connected).length

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / Integrations</p>
          <h1 className="text-3xl font-semibold tracking-tight">AI Providers</h1>
          <p className="mt-2 text-sm text-white/40">
            {connectedCount} of {integrations.length} connected · LLMs, image generation, and voice synthesis.
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
              <div className="flex flex-wrap gap-1.5">
                {i.uses.map((u) => (
                  <span key={u} className="text-[10px] text-white/35 border border-white/[0.06] rounded-full px-2 py-0.5">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-white/[0.06] border-dashed bg-white/[0.01] px-5 py-4">
        <p className="text-xs text-white/35 leading-relaxed">
          <span className="text-white/55">Spend tracking</span> — provider usage and cost reporting will surface in{" "}
          <Link href="/admin/finance" className="text-violet-400/70 hover:text-violet-300 transition-colors duration-150">Finance</Link> once webhooks are wired.
        </p>
      </div>
    </main>
  )
}
