"use client"

import { useState, useTransition } from "react"
import { generateMarketingCopy } from "@/app/actions/contentGen"
import type { ContentGenInput, ContentGenOutput } from "@/app/actions/contentGen"

interface ArtistOption { slug: string; name: string; genre: string; bio: string }
interface ReleaseOption { slug: string; title: string; type: string; artistSlug: string }

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d1016]">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.05]">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">{label}</p>
        <button
          type="button"
          onClick={copy}
          className="text-[9px] font-mono text-white/25 hover:text-white/60 transition-colors duration-150"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="px-4 py-3 text-xs text-white/60 whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  )
}

function HashtagBlock({ tags }: { tags: string[] }) {
  const [copied, setCopied] = useState(false)
  const text = tags.join(" ")
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d1016]">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.05]">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">Hashtags</p>
        <button type="button" onClick={copy} className="text-[9px] font-mono text-white/25 hover:text-white/60 transition-colors duration-150">
          {copied ? "Copied ✓" : "Copy all"}
        </button>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-white/50">{tag}</span>
        ))}
      </div>
    </div>
  )
}

export function ContentGenClient({
  artists,
  releases,
}: {
  artists: ArtistOption[]
  releases: ReleaseOption[]
}) {
  const [artistSlug, setArtistSlug] = useState(artists[0]?.slug ?? "")
  const [releaseSlug, setReleaseSlug] = useState("")
  const [customBio, setCustomBio] = useState("")
  const [result, setResult] = useState<ContentGenOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedArtist = artists.find((a) => a.slug === artistSlug)
  const artistReleases = releases.filter((r) => r.artistSlug === artistSlug)
  const selectedRelease = artistReleases.find((r) => r.slug === releaseSlug) ?? artistReleases[0]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedArtist) return
    setError(null)
    setResult(null)

    const input: ContentGenInput = {
      artistName:  selectedArtist.name,
      releaseName: selectedRelease?.title ?? "New Release",
      releaseType: selectedRelease?.type ?? "single",
      genre:       selectedArtist.genre,
      bio:         customBio || selectedArtist.bio,
    }

    startTransition(async () => {
      try {
        const out = await generateMarketingCopy(input)
        setResult(out)
      } catch (err) {
        setError(String(err))
      }
    })
  }

  const inputCls = "w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/25 focus:outline-none transition-colors duration-150"
  const labelCls = "block text-[9px] font-mono uppercase tracking-[0.2em] text-white/35 mb-2"

  return (
    <div className="space-y-8">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Artist</label>
            <select
              value={artistSlug}
              onChange={(e) => { setArtistSlug(e.target.value); setReleaseSlug("") }}
              className={inputCls}
            >
              {artists.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Release <span className="text-white/20 normal-case tracking-normal font-sans">(optional)</span></label>
            <select value={releaseSlug} onChange={(e) => setReleaseSlug(e.target.value)} className={inputCls}>
              <option value="">No specific release</option>
              {artistReleases.map((r) => (
                <option key={r.slug} value={r.slug}>{r.title} ({r.type})</option>
              ))}
            </select>
          </div>
        </div>

        {selectedArtist && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25 mb-1">Using artist</p>
            <p className="text-xs text-white/50"><span className="text-white/70">{selectedArtist.name}</span> · {selectedArtist.genre}</p>
          </div>
        )}

        <div>
          <label className={labelCls}>Custom bio override <span className="text-white/20 normal-case tracking-normal font-sans">(optional)</span></label>
          <textarea
            value={customBio}
            onChange={(e) => setCustomBio(e.target.value)}
            placeholder={selectedArtist?.bio ? `Default: "${selectedArtist.bio.slice(0, 80)}…"` : "Add context about this artist or release"}
            rows={3}
            className={inputCls + " resize-none"}
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !selectedArtist}
          className="rounded-full bg-white px-8 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-40 disabled:cursor-wait"
        >
          {isPending ? "Generating…" : "Generate Copy →"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">Generated Copy</p>
          <CopyBlock label="Instagram Caption"   value={result.igCaption} />
          <CopyBlock label="TikTok Caption"      value={result.tiktokCaption} />
          <CopyBlock label="X / Twitter Post"    value={result.xPost} />
          <CopyBlock label="YouTube Description" value={result.youtubeDescription} />
          <HashtagBlock tags={result.hashtags} />
          <CopyBlock label="Press Release"       value={result.pressRelease} />
        </div>
      )}
    </div>
  )
}
