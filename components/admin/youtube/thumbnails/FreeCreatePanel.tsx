"use client"

import { useState, useRef } from "react"
import { buildThumbnailPrompt } from "@/lib/youtube/thumbnails/prompts"
import { createPrompt, saveFreeCreateAsset } from "@/lib/youtube/thumbnails/actions"
import { getPresetsForProducer } from "@/lib/youtube/thumbnails/presets"

const STYLE_BUCKETS = [
  "MindLoft Sessions",
  "Buffalo Noir",
  "Jazz Smoke",
  "Harlem Private Society",
  "Museum Nights",
  "Street Prestige",
]

const CAMERA_STYLES = [
  "disposable flash camera",
  "35mm film grain",
  "VHS camcorder",
  "Arri Alexa cinematic",
  "magazine editorial flash",
  "macro close-up",
  "paparazzi zoom lens",
  "CCTV security camera",
]

const MOODS = [
  "mysterious and culturally elite",
  "dangerous calm",
  "jazz psychedelic elegance",
  "private culture and rare access",
  "nostalgic and emotionally rich",
  "cinematic loneliness",
  "stylish creative chaos",
  "strange luxury and hidden power",
]

const SCENE_TYPES = [
  "private Harlem loft",
  "Buffalo Route 33 at night",
  "museum hallway after hours",
  "luxury townhouse kitchen",
  "jazz club after closing time",
  "Buffalo rooftop at sunset",
  "underground parking garage",
  "corner store at midnight",
]

interface Props {
  producers: Array<{ slug: string; name: string }>
}

export function FreeCreatePanel({ producers }: Props) {
  const [producerSlug,       setProducerSlug]       = useState(producers[0]?.slug ?? "")
  const [artistName,         setArtistName]          = useState("")
  const [styleBucket,        setStyleBucket]         = useState("")
  const [camera,             setCamera]              = useState("")
  const [mood,               setMood]                = useState("")
  const [scene,              setScene]               = useState("")
  const [rawIdea,            setRawIdea]             = useState("")
  const [showRefiners,       setShowRefiners]        = useState(false)
  const [builtPrompt,        setBuiltPrompt]         = useState("")
  const [copied,             setCopied]              = useState(false)
  const [promptSaved,        setPromptSaved]         = useState(false)
  const [savingPrompt,       setSavingPrompt]        = useState(false)

  const [imageUrl,           setImageUrl]            = useState("")
  const [imageUrlInput,      setImageUrlInput]       = useState("")
  const [imageError,         setImageError]          = useState(false)
  const [savingAsset,        setSavingAsset]         = useState(false)
  const [savedAssetMsg,      setSavedAssetMsg]       = useState<string | null>(null)
  const [assetError,         setAssetError]          = useState<string | null>(null)
  const [assetName,          setAssetName]           = useState("")

  const [uploading,          setUploading]           = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const presets = getPresetsForProducer(producerSlug)
  const [selectedPresetSlug, setSelectedPresetSlug]  = useState("")
  const selectedPreset = presets.find((p) => p.preset_slug === selectedPresetSlug) ?? null

  function handleBuild() {
    const prompt = buildThumbnailPrompt({
      producerSlug: producerSlug || "nightwire",
      title:        artistName.trim() || undefined,
      mood:         mood || undefined,
      sceneType:    scene || undefined,
      cameraStyle:  camera || undefined,
      presetSlug:   selectedPresetSlug || undefined,
      rawIdea:      rawIdea.trim() || undefined,
    })
    setBuiltPrompt(prompt)
    setPromptSaved(false)
  }

  async function handleCopy() {
    if (!builtPrompt) return
    await navigator.clipboard.writeText(builtPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSavePrompt() {
    if (!builtPrompt || !producerSlug) return
    setSavingPrompt(true)
    await createPrompt({
      producerSlug,
      prompt:      builtPrompt,
      styleBucket: styleBucket || selectedPreset?.prompt_defaults.style_bucket,
      category:    "free-create",
    })
    setSavingPrompt(false)
    setPromptSaved(true)
  }

  function handleAddUrl() {
    const url = imageUrlInput.trim()
    if (!url) return
    setImageUrl(url)
    setImageError(false)
    setAssetError(null)
    setSavedAssetMsg(null)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setAssetError(null)

    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", "image")
    if (producerSlug) fd.append("producer_slug", producerSlug)

    try {
      const { uploadAssetFile } = await import("@/app/actions/assets")
      const result = await uploadAssetFile(fd)
      if (result && "url" in result) {
        setImageUrl(result.url as string)
        setImageUrlInput(result.url as string)
      } else if (result && "error" in result) {
        setAssetError((result as { error: string }).error)
      }
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleSaveToAssets() {
    if (!imageUrl || !producerSlug) return
    setSavingAsset(true)
    setAssetError(null)
    const result = await saveFreeCreateAsset({
      producerSlug,
      imageUrl,
      promptUsed:  builtPrompt || undefined,
      styleBucket: styleBucket || selectedPreset?.prompt_defaults.style_bucket,
      name:        assetName.trim() || undefined,
    })
    setSavingAsset(false)
    if ("error" in result) {
      setAssetError(result.error)
    } else {
      setSavedAssetMsg("Saved to Assets library")
      setTimeout(() => setSavedAssetMsg(null), 4000)
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* ── Producer row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">
            Producer
          </label>
          <select
            value={producerSlug}
            onChange={(e) => { setProducerSlug(e.target.value); setSelectedPresetSlug("") }}
            className="w-full rounded-xl border border-white/[0.1] bg-[#0d1016] px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
          >
            <option value="">— Select producer —</option>
            {producers.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">
            Artist / Context <span className="normal-case text-white/20">(optional — used in prompt)</span>
          </label>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="e.g. NightWire, Jazz era, 2024 trap…"
            className="w-full rounded-xl border border-white/[0.1] bg-[#0d1016] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* ── Style buckets ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-2">Style Bucket</p>
        <div className="flex flex-wrap gap-2">
          {STYLE_BUCKETS.map((b) => (
            <button
              key={b}
              onClick={() => setStyleBucket(styleBucket === b ? "" : b)}
              className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                styleBucket === b
                  ? "bg-violet-600/30 border-violet-500/60 text-violet-300"
                  : "border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* ── Presets (if available for this producer) ──────────────────── */}
      {presets.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-2">Preset</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.preset_slug}
                onClick={() => setSelectedPresetSlug(selectedPresetSlug === p.preset_slug ? "" : p.preset_slug)}
                className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                  selectedPresetSlug === p.preset_slug
                    ? "bg-white/[0.08] border-white/30 text-white"
                    : "border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20"
                }`}
              >
                {p.name.replace(/^NightWire — /, "")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main two-col layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Prompt builder ──────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">
              Visual Idea
            </label>
            <textarea
              value={rawIdea}
              onChange={(e) => setRawIdea(e.target.value)}
              placeholder="Describe what you want to see — location, mood, colors, subjects, energy…"
              rows={5}
              className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
            />
          </div>

          {/* Camera style */}
          <div>
            <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">
              Camera Style
            </label>
            <select
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
            >
              <option value="">— Auto from preset —</option>
              {CAMERA_STYLES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Refiners toggle */}
          <button
            type="button"
            onClick={() => setShowRefiners((p) => !p)}
            className="text-[10px] uppercase tracking-[0.15em] text-white/25 hover:text-white/50 transition-colors"
          >
            {showRefiners ? "▾ Hide Refiners" : "▸ More Refiners (mood / scene)"}
          </button>

          {showRefiners && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Mood</label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
                >
                  <option value="">— Auto —</option>
                  {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Scene</label>
                <select
                  value={scene}
                  onChange={(e) => setScene(e.target.value)}
                  className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
                >
                  <option value="">— Auto —</option>
                  {SCENE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleBuild}
            className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-sm transition-all"
          >
            Build Prompt ↵
          </button>
        </div>

        {/* ── RIGHT: Output + Image ─────────────────────────────────── */}
        <div className="space-y-4">
          {builtPrompt ? (
            <>
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">
                  Enhanced Prompt
                </label>
                <textarea
                  value={builtPrompt}
                  onChange={(e) => setBuiltPrompt(e.target.value)}
                  rows={7}
                  className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white/85 focus:outline-none focus:border-violet-500/50 resize-none font-mono leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopy}
                  className="py-3 rounded-xl border border-violet-500/40 bg-violet-600/10 text-violet-300 hover:bg-violet-600/20 hover:border-violet-500/60 active:scale-[0.98] text-sm font-medium transition-all"
                >
                  {copied ? "Copied!" : "Copy Prompt"}
                </button>
                <button
                  onClick={handleSavePrompt}
                  disabled={savingPrompt || promptSaved || !producerSlug}
                  className="py-3 rounded-xl border border-white/[0.1] text-white/55 hover:text-white hover:border-white/25 disabled:opacity-40 text-sm transition-colors"
                >
                  {savingPrompt ? "Saving…" : promptSaved ? "Saved ✓" : "Save Prompt"}
                </button>
              </div>
              <p className="text-[10px] text-white/20 text-center">
                Copy → paste into Midjourney → download → add image below
              </p>
            </>
          ) : (
            <div className="h-36 flex items-center justify-center rounded-2xl border border-dashed border-white/[0.06]">
              <p className="text-sm text-white/15 text-center px-4">
                Build a prompt to see it here
              </p>
            </div>
          )}

          {/* ── Image section ──────────────────────────────────── */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Generated Image</p>

            {imageUrl && !imageError ? (
              <div className="relative rounded-xl overflow-hidden border border-white/[0.1]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Generated thumbnail"
                  className="w-full object-cover rounded-xl"
                  onError={() => setImageError(true)}
                />
                <button
                  onClick={() => { setImageUrl(""); setImageUrlInput(""); setImageError(false); setSavedAssetMsg(null) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white/60 hover:text-white text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                {/* URL input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                    placeholder="Paste image URL (Midjourney, external…)"
                    className="flex-1 bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={handleAddUrl}
                    disabled={!imageUrlInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-white/60 hover:text-white hover:bg-white/[0.1] disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    Add URL
                  </button>
                </div>

                {/* File upload */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] text-white/20">or</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-3 rounded-xl border border-dashed border-white/[0.1] text-sm text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-40 transition-colors"
                >
                  {uploading ? "Uploading…" : "Upload image file"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </>
            )}

            {imageError && (
              <p className="text-[11px] text-red-400/70">Could not load image from that URL.</p>
            )}

            {/* Asset name + save */}
            {imageUrl && !imageError && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Asset name (optional)"
                  className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={handleSaveToAssets}
                  disabled={savingAsset || !producerSlug}
                  className="w-full py-3.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-sm disabled:opacity-50 transition-all"
                >
                  {savingAsset ? "Saving…" : "Save to Assets"}
                </button>
                {savedAssetMsg && (
                  <p className="text-[11px] text-emerald-400/80 text-center">{savedAssetMsg}</p>
                )}
                {assetError && (
                  <p className="text-[11px] text-red-400/70 text-center">{assetError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
