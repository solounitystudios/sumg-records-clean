import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getAllChannels } from "@/lib/db/youtube"
import { getProducers } from "@/lib/db/producers"
import { createYtChannel } from "@/app/actions/youtube"
import { ChannelsClient } from "./ChannelsClient"

export const metadata = { title: "YouTube Channels — SUMG Admin" }

const input =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1.5"

export default async function YouTubeChannelsPage() {
  await requireAdmin()
  const [channels, producers] = await Promise.all([getAllChannels(), getProducers()])

  const producerMap = Object.fromEntries(producers.map((p) => [p.slug, p.name]))

  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <Link href="/admin/youtube" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← YouTube Automation
        </Link>
        <h1 className="text-lg font-semibold">YouTube Channels</h1>
        <p className="text-xs text-white/35 mt-1">{channels.length} channel{channels.length !== 1 ? "s" : ""} configured</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Channel list with routing edit */}
        <div>
          <ChannelsClient channels={channels} producerMap={producerMap} />
        </div>

        {/* Add channel form */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 self-start">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-5">Add Channel</p>
          <form action={createYtChannel} className="space-y-4">
            <div>
              <label htmlFor="yt-producer" className={labelClass}>Producer *</label>
              <select id="yt-producer" name="producer_slug" required className={input}>
                <option value="">Select producer…</option>
                {producers.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="yt-channel-id" className={labelClass}>Channel ID *</label>
              <input id="yt-channel-id" name="channel_id" type="text" required placeholder="UC…" className={input} />
              <p className="mt-1 text-[10px] text-white/20">Found in YouTube Studio → Settings → Channel.</p>
            </div>
            <div>
              <label htmlFor="yt-handle" className={labelClass}>Handle</label>
              <input id="yt-handle" name="channel_handle" type="text" placeholder="@GRVNDbeats" className={input} />
            </div>
            <div>
              <label htmlFor="yt-channel-url" className={labelClass}>Channel URL</label>
              <input id="yt-channel-url" name="channel_url" type="url" placeholder="https://youtube.com/@…" className={input} />
            </div>
            <div>
              <label htmlFor="yt-cadence" className={labelClass}>Upload Cadence (per day)</label>
              <input id="yt-cadence" name="upload_cadence" type="number" min="1" max="10" defaultValue="3" className={input} />
            </div>
            <div>
              <label htmlFor="yt-title-tpl" className={labelClass}>Title Template</label>
              <input id="yt-title-tpl" name="title_template" type="text"
                placeholder="{TRACK} — {ARTIST} [Type Beat]" className={input} />
            </div>
            <div>
              <label htmlFor="yt-desc-tpl" className={labelClass}>Description Template</label>
              <textarea id="yt-desc-tpl" name="description_template" rows={3}
                placeholder="🎧 {TRACK} — produced by {ARTIST}"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-y" />
            </div>
            <div>
              <label htmlFor="yt-tags" className={labelClass}>Default Tags</label>
              <textarea id="yt-tags" name="default_tags" rows={3}
                placeholder={"type beat\nhip hop\nfree beat"}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-y" />
              <p className="mt-1 text-[10px] text-white/20">One tag per line.</p>
            </div>
            <div className="pt-2 border-t border-white/[0.06]">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 mb-3">Routing Config</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="yt-genres" className={labelClass}>Preferred Genres</label>
                  <textarea id="yt-genres" name="preferred_genres" rows={2}
                    placeholder={"trap\ndrill"}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition resize-none font-mono" />
                  <p className="mt-1 text-[10px] text-white/20">One per line. Empty = accepts all.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="yt-bpm-min" className={labelClass}>BPM Min</label>
                    <input id="yt-bpm-min" name="bpm_min" type="number" min="40" max="250" placeholder="e.g. 130" className={input} />
                  </div>
                  <div>
                    <label htmlFor="yt-bpm-max" className={labelClass}>BPM Max</label>
                    <input id="yt-bpm-max" name="bpm_max" type="number" min="40" max="250" placeholder="e.g. 165" className={input} />
                  </div>
                </div>
                <div>
                  <label htmlFor="yt-priority" className={labelClass}>Routing Priority (0–10)</label>
                  <input id="yt-priority" name="routing_priority" type="number" min="0" max="10" defaultValue="0" className={input} />
                </div>
              </div>
            </div>
            <button type="submit"
              className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 transition">
              Add Channel
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
