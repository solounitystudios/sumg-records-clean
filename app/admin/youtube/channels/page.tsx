import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getAllChannels } from "@/lib/db/youtube"
import { getProducers } from "@/lib/db/producers"
import { createYtChannel } from "@/app/actions/youtube"

export const metadata = { title: "YouTube Channels — SUMG Admin" }

const input =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1.5"

const STATUS_STYLE: Record<string, string> = {
  active:  "text-green-400/70 border-green-500/25",
  paused:  "text-yellow-400/60 border-yellow-500/20",
  revoked: "text-red-400/50 border-red-500/20",
}

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
        {/* Channel list */}
        <div>
          {channels.length === 0 ? (
            <p className="text-sm text-white/25 py-12 text-center">No channels yet. Add one →</p>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
              {channels.map((ch, i) => (
                <div key={ch.id}
                  className={`px-5 py-4 ${i < channels.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white/80 truncate">
                          {ch.channelHandle ?? ch.channelId}
                        </p>
                        <span className={`text-[9px] border px-1.5 py-0.5 rounded uppercase tracking-wide ${STATUS_STYLE[ch.status]}`}>
                          {ch.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {producerMap[ch.producerSlug] ?? ch.producerSlug} · {ch.uploadCadence} uploads/day
                      </p>
                      <p className="text-[10px] text-white/20 font-mono mt-0.5">{ch.channelId}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      {ch.oauthConnected ? (
                        <span className="text-[9px] text-green-400/60 border border-green-500/20 px-1.5 py-0.5 rounded">OAuth ✓</span>
                      ) : (
                        <Link href="/admin/youtube/engine"
                          className="text-[9px] text-white/25 hover:text-white/50 border border-white/[0.07] px-1.5 py-0.5 rounded transition-colors">
                          Connect →
                        </Link>
                      )}
                      {ch.channelUrl && (
                        <a href={ch.channelUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-white/20 hover:text-white/50 transition-colors">↗</a>
                      )}
                    </div>
                  </div>

                  {ch.titleTemplate && (
                    <p className="mt-2 text-[10px] font-mono text-white/20 truncate">
                      Title: {ch.titleTemplate}
                    </p>
                  )}

                  {ch.defaultTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ch.defaultTags.slice(0, 5).map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 border border-white/[0.06] text-white/25 rounded font-mono">{t}</span>
                      ))}
                      {ch.defaultTags.length > 5 && (
                        <span className="text-[9px] text-white/20">+{ch.defaultTags.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
