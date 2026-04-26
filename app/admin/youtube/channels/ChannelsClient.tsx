"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { YtChannel } from "@/lib/db/youtube"
import { updateChannelRouting } from "@/app/actions/youtube"

const STATUS_STYLE: Record<string, string> = {
  active:  "text-green-400/70 border-green-500/25",
  paused:  "text-yellow-400/60 border-yellow-500/20",
  revoked: "text-red-400/50 border-red-500/20",
}

function routingSummary(ch: YtChannel): string {
  const parts: string[] = []
  if (ch.preferredGenres.length > 0) parts.push(ch.preferredGenres.join(", "))
  else parts.push("all genres")
  if (ch.bpmMin !== null || ch.bpmMax !== null) {
    const lo = ch.bpmMin ?? "?"
    const hi = ch.bpmMax ?? "?"
    parts.push(`${lo}–${hi} BPM`)
  } else {
    parts.push("any BPM")
  }
  if (ch.routingPriority > 0) parts.push(`priority ${ch.routingPriority}`)
  return parts.join(" · ")
}

function hasRoutingConfig(ch: YtChannel): boolean {
  return ch.preferredGenres.length > 0 || ch.bpmMin !== null || ch.bpmMax !== null || ch.routingPriority > 0
}

function ChannelCard({
  ch,
  producerName,
}: {
  ch: YtChannel
  producerName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const [genres, setGenres]     = useState(ch.preferredGenres.join("\n"))
  const [bpmMin, setBpmMin]     = useState(ch.bpmMin?.toString() ?? "")
  const [bpmMax, setBpmMax]     = useState(ch.bpmMax?.toString() ?? "")
  const [priority, setPriority] = useState(ch.routingPriority.toString())

  function handleSave() {
    const fd = new FormData()
    fd.set("id", ch.id)
    fd.set("preferred_genres", genres)
    fd.set("bpm_min", bpmMin)
    fd.set("bpm_max", bpmMax)
    fd.set("routing_priority", priority)

    startTransition(async () => {
      const result = await updateChannelRouting(fd)
      if (result.ok) {
        setMsg("Saved")
        setTimeout(() => setMsg(null), 2500)
        setOpen(false)
        router.refresh()
      } else {
        setMsg(result.error ?? "Save failed")
      }
    })
  }

  const configured = hasRoutingConfig(ch)

  return (
    <div className="px-5 py-4 border-b border-white/[0.05] last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white/80 truncate">
              {ch.channelHandle ?? ch.channelId}
            </p>
            <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide ${STATUS_STYLE[ch.status]}`}>
              {ch.status}
            </span>
            {ch.oauthConnected && (
              <span className="text-[9px] text-green-400/60 border border-green-500/20 px-1.5 py-0.5 rounded">OAuth ✓</span>
            )}
          </div>
          <p className="text-[10px] text-white/30 mt-0.5">
            {producerName} · {ch.uploadCadence} uploads/day
          </p>
          <p className="text-[10px] text-white/20 font-mono mt-0.5">{ch.channelId}</p>

          {/* Routing summary */}
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${configured ? "border-violet-500/30 text-violet-400/70 bg-violet-500/5" : "border-white/[0.07] text-white/20"}`}>
              {configured ? "⚡ routing configured" : "routing: any"}
            </span>
            <span className="text-[9px] text-white/20">{routingSummary(ch)}</span>
          </div>

          {ch.titleTemplate && (
            <p className="mt-1.5 text-[10px] font-mono text-white/20 truncate">Title: {ch.titleTemplate}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-none">
          {ch.channelUrl && (
            <a href={ch.channelUrl} target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-white/20 hover:text-white/50 transition-colors">↗</a>
          )}
          <button
            onClick={() => setOpen(!open)}
            className={`text-[9px] border px-2 py-1 rounded-lg transition-colors ${open ? "border-white/25 text-white/60" : "border-white/[0.07] text-white/25 hover:text-white/50 hover:border-white/15"}`}
          >
            {open ? "▲ close" : "Edit Routing"}
          </button>
        </div>
      </div>

      {/* Inline routing form */}
      {open && (
        <div className="mt-4 pt-4 border-t border-white/[0.05] space-y-4 max-w-sm">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">Routing Config</p>

          <div>
            <label className="block text-[9px] uppercase tracking-[0.15em] text-white/30 mb-1.5">
              Preferred Genres <span className="normal-case text-white/15">(one per line, empty = all)</span>
            </label>
            <textarea
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              rows={3}
              placeholder={"trap\ndrill\nboom bap"}
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-none font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] uppercase tracking-[0.15em] text-white/30 mb-1.5">BPM Min</label>
              <input
                type="number"
                value={bpmMin}
                onChange={(e) => setBpmMin(e.target.value)}
                min={40} max={250}
                placeholder="e.g. 130"
                className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.15em] text-white/30 mb-1.5">BPM Max</label>
              <input
                type="number"
                value={bpmMax}
                onChange={(e) => setBpmMax(e.target.value)}
                min={40} max={250}
                placeholder="e.g. 165"
                className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-[0.15em] text-white/30 mb-1.5">
              Routing Priority <span className="normal-case text-white/15">(0–10, higher = preferred)</span>
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              min={0} max={10}
              className="w-24 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-white/90 transition disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save Routing"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-white/30 hover:text-white/60 transition"
            >
              Cancel
            </button>
            {msg && <span className="text-[10px] text-emerald-400/70">{msg}</span>}
          </div>

          <p className="text-[9px] text-white/15 leading-relaxed">
            Genre and BPM rules are scored during job creation. Empty fields accept all values. Higher-priority channels are preferred when scores tie.
          </p>
        </div>
      )}
    </div>
  )
}

export function ChannelsClient({
  channels,
  producerMap,
}: {
  channels: YtChannel[]
  producerMap: Record<string, string>
}) {
  if (channels.length === 0) {
    return <p className="text-sm text-white/25 py-12 text-center">No channels yet. Add one →</p>
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
      {channels.map((ch) => (
        <ChannelCard
          key={ch.id}
          ch={ch}
          producerName={producerMap[ch.producerSlug] ?? ch.producerSlug}
        />
      ))}
    </div>
  )
}
