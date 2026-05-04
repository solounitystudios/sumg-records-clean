"use client"

import { useState, useRef, useTransition } from "react"
import { buildThumbnailPrompt } from "@/lib/youtube/thumbnails/prompts"
import {
  createPrompt,
  saveFreeCreateAsset,
  createMidjourneyPendingAsset,
  completeMidjourneyAsset,
} from "@/lib/youtube/thumbnails/actions"
import { getPresetsForProducer } from "@/lib/youtube/thumbnails/presets"
import { generateThumbnailImages } from "@/app/actions/generateThumbnailImage"

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

function isValidHttpImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

// ─── Generated preview card ───────────────────────────────────────────────────

interface GenResult {
  imageUrl:      string
  assetId:       string
  revisedPrompt?: string
  provider:      "openai" | "midjourney"
}

function GeneratedCard({ img, prompt }: { img: GenResult; prompt: string }) {
  const [urlCopied, setUrlCopied] = useState(false)

  return (
    <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#0a0c11]">
      <div className="aspect-video overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.imageUrl}
          alt="Generated thumbnail"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
            img.provider === "openai"
              ? "border-violet-500/30 bg-violet-600/20 text-violet-300"
              : "border-sky-500/30 bg-sky-600/20 text-sky-300"
          }`}>
            {img.provider === "openai" ? "⚡ OpenAI" : "✦ Midjourney"}
          </span>
          <span className="text-[9px] text-emerald-400/60">✓ Saved</span>
        </div>
        {(img.revisedPrompt ?? prompt) && (
          <p className="text-[10px] text-white/35 font-mono leading-relaxed line-clamp-2 break-words">
            {img.revisedPrompt ?? prompt}
          </p>
        )}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(img.imageUrl)
            setUrlCopied(true)
            setTimeout(() => setUrlCopied(false), 2000)
          }}
          className="w-full py-1.5 rounded-lg border border-white/[0.08] text-[10px] text-white/40 hover:text-white hover:border-white/20 transition-colors"
        >
          {urlCopied ? "Copied!" : "Copy URL"}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type GenProvider = "openai" | "midjourney" | "manual"

interface Props {
  producers:               Array<{ slug: string; name: string }>
  generationEnabled:       boolean
  initialPrompt?:          string
  onInitialPromptConsumed?: () => void
}

export function FreeCreatePanel({ producers, generationEnabled, initialPrompt, onInitialPromptConsumed }: Props) {
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

  // Provider selector
  const [genProvider, setGenProvider] = useState<GenProvider>(generationEnabled ? "openai" : "midjourney")

  // OpenAI generation state
  const [isGenerating, startGenerating] = useTransition()
  const [genCount,  setGenCount]  = useState<1 | 2 | 4>(2)
  const [genError,  setGenError]  = useState<string | null>(null)
  const [genResults, setGenResults] = useState<GenResult[]>([])

  // Midjourney queue state
  const [mjSending,    setMjSending]    = useState(false)
  const [mjPendingId,  setMjPendingId]  = useState<string | null>(null)
  const [mjError,      setMjError]      = useState<string | null>(null)
  const [mjCompleting, setMjCompleting] = useState(false)
  const [mjUrlInput,   setMjUrlInput]   = useState("")
  const [mjUrlWarning, setMjUrlWarning] = useState<string | null>(null)
  const [mjUploading,  setMjUploading]  = useState(false)
  const mjFileRef = useRef<HTMLInputElement>(null)

  // Manual import state
  const [imageUrl,      setImageUrl]      = useState("")
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [imageError,    setImageError]    = useState(false)
  const [savingAsset,   setSavingAsset]   = useState(false)
  const [savedAssetMsg, setSavedAssetMsg] = useState<string | null>(null)
  const [assetError,    setAssetError]    = useState<string | null>(null)
  const [assetName,     setAssetName]     = useState("")
  const [promptWarning, setPromptWarning] = useState<string | null>(null)
  const [uploading,     setUploading]     = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const presets = getPresetsForProducer(producerSlug)
  const [selectedPresetSlug, setSelectedPresetSlug] = useState("")
  const selectedPreset = presets.find((p) => p.preset_slug === selectedPresetSlug) ?? null

  // Absorb initialPrompt from Prompt Library → Free Create cross-tab handoff
  const [lastInitialPrompt, setLastInitialPrompt] = useState(initialPrompt)
  if (initialPrompt && initialPrompt !== lastInitialPrompt) {
    setLastInitialPrompt(initialPrompt)
    setBuiltPrompt(initialPrompt)
    setGenResults([])
    onInitialPromptConsumed?.()
  }

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
    setGenResults([])
    resetMjState()
  }

  function resetMjState() {
    setMjPendingId(null)
    setMjError(null)
    setMjUrlInput("")
    setMjUrlWarning(null)
  }

  function handleProviderChange(p: GenProvider) {
    setGenProvider(p)
    setGenResults([])
    setGenError(null)
    resetMjState()
    setImageUrl("")
    setImageUrlInput("")
    setImageError(false)
    setSavedAssetMsg(null)
    setAssetError(null)
    setPromptWarning(null)
  }

  async function handleCopy() {
    if (!builtPrompt) return
    await navigator.clipboard.writeText(builtPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyMjPrompt() {
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

  // ── OpenAI ──────────────────────────────────────────────────────────────────

  function handleGenerateImage() {
    if (!builtPrompt.trim()) return
    setGenError(null)
    setGenResults([])
    startGenerating(async () => {
      const result = await generateThumbnailImages({
        prompt:       builtPrompt.trim(),
        count:        genCount,
        producerSlug: producerSlug || undefined,
      })
      if ("error" in result) {
        setGenError(result.error)
        return
      }
      setGenResults(result.images.map((img) => ({
        imageUrl:      img.imageUrl,
        assetId:       img.assetId,
        revisedPrompt: img.revisedPrompt,
        provider:      "openai" as const,
      })))
    })
  }

  // ── Midjourney ──────────────────────────────────────────────────────────────

  async function handleSendToMidjourneyQueue() {
    if (!builtPrompt.trim() || !producerSlug) return
    setMjSending(true)
    setMjError(null)
    const result = await createMidjourneyPendingAsset({
      producerSlug,
      prompt:      builtPrompt.trim(),
      styleBucket: styleBucket || selectedPreset?.prompt_defaults.style_bucket || undefined,
    })
    setMjSending(false)
    if ("error" in result) {
      setMjError(result.error)
      return
    }
    setMjPendingId(result.id)
  }

  async function handleMjCompleteByUrl() {
    const url = mjUrlInput.trim()
    if (!url || !mjPendingId) return
    if (!isValidHttpImageUrl(url)) {
      setMjUrlWarning("Paste a direct image URL (https://…), not a prompt.")
      return
    }
    setMjUrlWarning(null)
    setMjCompleting(true)
    const result = await completeMidjourneyAsset({
      id:           mjPendingId,
      imageUrl:     url,
      producerSlug: producerSlug || undefined,
    })
    setMjCompleting(false)
    if ("error" in result) {
      setMjError(result.error)
      return
    }
    setGenResults((prev) => [...prev, {
      imageUrl:  result.permanentUrl,
      assetId:   result.assetId,
      provider:  "midjourney" as const,
    }])
    setMjPendingId(null)
    setMjUrlInput("")
  }

  async function handleMjFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !mjPendingId) return
    setMjUploading(true)
    setMjError(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", "image")
    if (producerSlug) fd.append("producer_slug", producerSlug)
    try {
      const { uploadAssetFile } = await import("@/app/actions/assets")
      const uploadResult = await uploadAssetFile(fd)
      if ("error" in uploadResult) {
        setMjError((uploadResult as { error: string }).error)
        return
      }
      const r = uploadResult as { id: string; url: string }
      const result = await completeMidjourneyAsset({
        id:              mjPendingId,
        imageUrl:        r.url,
        existingAssetId: r.id,
        producerSlug:    producerSlug || undefined,
      })
      if ("error" in result) {
        setMjError(result.error)
        return
      }
      setGenResults((prev) => [...prev, {
        imageUrl:  result.permanentUrl,
        assetId:   result.assetId,
        provider:  "midjourney" as const,
      }])
      setMjPendingId(null)
      setMjUrlInput("")
    } catch (err) {
      setMjError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setMjUploading(false)
      if (mjFileRef.current) mjFileRef.current.value = ""
    }
  }

  // ── Manual Import ──────────────────────────────────────────────────────────

  function handleAddUrl() {
    const url = imageUrlInput.trim()
    if (!url) return
    if (!isValidHttpImageUrl(url)) {
      setPromptWarning(
        "This looks like a prompt, not an image URL. Copy the prompt above, generate the image in Midjourney or OpenAI, then paste the final image link or upload the file below."
      )
      return
    }
    setPromptWarning(null)
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
      setSavedAssetMsg("Saved to Assets and Thumbnail Library ✓")
      setTimeout(() => setSavedAssetMsg(null), 5000)
    }
  }

  function clearImage() {
    setImageUrl("")
    setImageUrlInput("")
    setImageError(false)
    setSavedAssetMsg(null)
  }

  return (
    <div className="space-y-6 pb-24">

      {/* Producer row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Producer</label>
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

      {/* Style buckets */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-2">Style Bucket</p>
        <div className="flex flex-wrap gap-2">
          {STYLE_BUCKETS.map((b) => (
            <button
              type="button"
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

      {/* Presets */}
      {presets.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-2">Preset</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                type="button"
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

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: Prompt builder */}
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Visual Idea</label>
            <textarea
              value={rawIdea}
              onChange={(e) => setRawIdea(e.target.value)}
              placeholder="Describe what you want to see — location, mood, colors, subjects, energy…"
              rows={5}
              className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Camera Style</label>
            <select
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 appearance-none"
            >
              <option value="">— Auto from preset —</option>
              {CAMERA_STYLES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

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
            type="button"
            onClick={handleBuild}
            className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-sm transition-all"
          >
            Build Prompt ↵
          </button>
        </div>

        {/* RIGHT: Prompt output + provider selector + action */}
        <div className="space-y-4">
          {builtPrompt ? (
            <>
              <div>
                <label className="block text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5">Enhanced Prompt</label>
                <textarea
                  value={builtPrompt}
                  onChange={(e) => { setBuiltPrompt(e.target.value); setGenResults([]); resetMjState() }}
                  rows={7}
                  className="w-full bg-black/30 border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white/85 focus:outline-none focus:border-violet-500/50 resize-none font-mono leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="py-3 rounded-xl border border-violet-500/40 bg-violet-600/10 text-violet-300 hover:bg-violet-600/20 hover:border-violet-500/60 active:scale-[0.98] text-sm font-medium transition-all"
                >
                  {copied ? "Copied!" : "Copy Prompt"}
                </button>
                <button
                  type="button"
                  onClick={handleSavePrompt}
                  disabled={savingPrompt || promptSaved || !producerSlug}
                  className="py-3 rounded-xl border border-white/[0.1] text-white/55 hover:text-white hover:border-white/25 disabled:opacity-40 text-sm transition-colors"
                >
                  {savingPrompt ? "Saving…" : promptSaved ? "Saved to Library ✓" : "Save Prompt"}
                </button>
              </div>

              {/* ── Provider selector ── */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => handleProviderChange("openai")}
                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-medium transition-colors ${
                    genProvider === "openai"
                      ? "bg-violet-600/40 text-white border border-violet-500/40"
                      : "text-white/35 hover:text-white/60"
                  }`}
                >
                  ⚡ Quick · OpenAI
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("midjourney")}
                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-medium transition-colors ${
                    genProvider === "midjourney"
                      ? "bg-sky-600/30 text-sky-200 border border-sky-500/30"
                      : "text-white/35 hover:text-white/60"
                  }`}
                >
                  ✦ Premium · Midjourney
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("manual")}
                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-medium transition-colors ${
                    genProvider === "manual"
                      ? "bg-white/[0.08] text-white border border-white/20"
                      : "text-white/35 hover:text-white/60"
                  }`}
                >
                  ↑ Manual Import
                </button>
              </div>

              {/* ── OpenAI panel ── */}
              {genProvider === "openai" && (
                <div className="space-y-3">
                  {generationEnabled ? (
                    <>
                      {/* Count selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 uppercase tracking-[0.15em] shrink-0">Count</span>
                        {([1, 2, 4] as const).map((n) => (
                          <button
                            type="button"
                            key={n}
                            onClick={() => setGenCount(n)}
                            className={`w-8 h-8 rounded-lg text-[11px] font-mono transition-colors border ${
                              genCount === n
                                ? "bg-violet-600/40 border-violet-500/40 text-white"
                                : "border-white/[0.08] text-white/35 hover:text-white/60 hover:border-white/20"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                        <span className="text-[9px] text-white/20 ml-1">
                          image{genCount !== 1 ? "s" : ""} · DALL-E 3
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateImage}
                        disabled={isGenerating || !builtPrompt.trim()}
                        className="w-full py-3.5 rounded-xl bg-violet-700/70 hover:bg-violet-700 active:scale-[0.98] text-white font-semibold text-sm disabled:opacity-40 transition-all border border-violet-500/30"
                      >
                        {isGenerating
                          ? `Generating ${genCount} thumbnail version${genCount !== 1 ? "s" : ""}…`
                          : `Generate ${genCount} version${genCount !== 1 ? "s" : ""} (DALL-E 3) →`
                        }
                      </button>
                    </>
                  ) : (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                      <p className="text-[10px] text-white/30 leading-relaxed">
                        Add <span className="font-mono text-amber-400/60">OPENAI_API_KEY</span> to enable direct generation.
                      </p>
                    </div>
                  )}

                  {genError && (
                    <div className="rounded-xl bg-red-500/[0.07] border border-red-500/20 px-3 py-2.5">
                      <p className="text-[11px] text-red-400/80 leading-relaxed">{genError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Midjourney panel ── */}
              {genProvider === "midjourney" && (
                <div className="space-y-3">
                  {!mjPendingId ? (
                    <>
                      <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] px-4 py-3">
                        <p className="text-[11px] text-sky-300/70 leading-relaxed">
                          Sends this prompt to the Midjourney queue. Copy the prompt → generate in Midjourney → paste the finished image URL below.
                        </p>
                      </div>
                      {mjError && (
                        <p className="text-[11px] text-red-400/70">{mjError}</p>
                      )}
                      <button
                        type="button"
                        onClick={handleSendToMidjourneyQueue}
                        disabled={mjSending || !builtPrompt.trim() || !producerSlug}
                        className="w-full py-3.5 rounded-xl bg-sky-700/60 hover:bg-sky-700/80 active:scale-[0.98] text-white font-semibold text-sm disabled:opacity-40 transition-all border border-sky-500/30"
                      >
                        {mjSending ? "Sending…" : "Send to Midjourney Queue →"}
                      </button>
                      {!producerSlug && (
                        <p className="text-[10px] text-white/30 text-center">Select a producer first</p>
                      )}
                    </>
                  ) : (
                    /* Pending card — prompt queued, awaiting image */
                    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/[0.04] p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300/60">Queued — Awaiting Image</p>
                      </div>

                      <div className="bg-black/30 rounded-lg px-3 py-2.5">
                        <p className="text-[11px] text-white/50 font-mono leading-relaxed line-clamp-3">{builtPrompt}</p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyMjPrompt}
                        className="w-full py-2.5 rounded-xl border border-sky-500/30 bg-sky-600/10 text-sky-300 hover:bg-sky-600/20 text-sm font-medium transition-colors"
                      >
                        {copied ? "Copied!" : "Copy Prompt for Midjourney"}
                      </button>

                      <div className="h-px bg-white/[0.06]" />

                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">Paste Finished Image URL</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mjUrlInput}
                          onChange={(e) => { setMjUrlInput(e.target.value); setMjUrlWarning(null) }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleMjCompleteByUrl() } }}
                          placeholder="https://cdn.midjourney.com/…"
                          className={`flex-1 bg-black/30 border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors ${mjUrlWarning ? "border-amber-500/50" : "border-white/[0.08] focus:border-sky-500/50"}`}
                        />
                        <button
                          type="button"
                          onClick={handleMjCompleteByUrl}
                          disabled={mjCompleting || !mjUrlInput.trim()}
                          className="px-4 py-2.5 rounded-xl bg-sky-700/60 hover:bg-sky-700/80 text-sm text-white disabled:opacity-40 transition-colors whitespace-nowrap"
                        >
                          {mjCompleting ? "Saving…" : "Complete"}
                        </button>
                      </div>
                      {mjUrlWarning && <p className="text-[10px] text-amber-300/70">{mjUrlWarning}</p>}

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-[10px] text-white/20">or upload</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>

                      <button
                        type="button"
                        onClick={() => mjFileRef.current?.click()}
                        disabled={mjUploading}
                        className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.1] text-sm text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-40 transition-colors"
                      >
                        {mjUploading ? "Uploading…" : "Upload Finished Image"}
                      </button>
                      <input ref={mjFileRef} type="file" accept="image/*" className="hidden" onChange={handleMjFileUpload} />

                      {mjError && <p className="text-[11px] text-red-400/70">{mjError}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* ── Manual Import panel ── */}
              {genProvider === "manual" && (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Import Finished Thumbnail</p>

                  {imageUrl && !imageError ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/[0.1]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Selected thumbnail"
                        className="w-full object-cover rounded-xl"
                        onError={() => setImageError(true)}
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white/60 hover:text-white text-xs flex items-center justify-center"
                        title="Clear image"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={imageUrlInput}
                          onChange={(e) => { setImageUrlInput(e.target.value); setPromptWarning(null) }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl() } }}
                          placeholder="Paste final image URL here — not the prompt"
                          className={`flex-1 bg-black/30 border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors ${promptWarning ? "border-amber-500/50 focus:border-amber-500/70" : "border-white/[0.08] focus:border-violet-500/50"}`}
                        />
                        <button
                          type="button"
                          onClick={handleAddUrl}
                          disabled={!imageUrlInput.trim()}
                          className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-white/60 hover:text-white hover:bg-white/[0.1] disabled:opacity-40 transition-colors whitespace-nowrap"
                        >
                          Import URL
                        </button>
                      </div>

                      {promptWarning && (
                        <div className="rounded-xl bg-amber-500/[0.08] border border-amber-500/25 px-3 py-2.5">
                          <p className="text-[11px] text-amber-300/80 leading-relaxed">{promptWarning}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-[10px] text-white/20">or</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>

                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="w-full py-3 rounded-xl border border-dashed border-white/[0.1] text-sm text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-40 transition-colors"
                      >
                        {uploading ? "Uploading…" : "Upload Image File"}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </>
                  )}

                  {imageError && (
                    <p className="text-[11px] text-red-400/70">Could not load image from that URL. Try uploading the file instead.</p>
                  )}

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
                        type="button"
                        onClick={handleSaveToAssets}
                        disabled={savingAsset || !producerSlug}
                        className="w-full py-3.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-sm disabled:opacity-50 transition-all"
                      >
                        {savingAsset ? "Saving…" : "Save to Assets"}
                      </button>
                      {savedAssetMsg && <p className="text-[11px] text-emerald-400/80 text-center">{savedAssetMsg}</p>}
                      {assetError && <p className="text-[11px] text-red-400/70 text-center">{assetError}</p>}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="h-36 flex items-center justify-center rounded-2xl border border-dashed border-white/[0.06]">
              <p className="text-sm text-white/15 text-center px-4">Build a prompt to see options here</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Generated Versions grid (full width, shown after any generation) ── */}
      {genResults.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">
              Generated Versions
              <span className="ml-1.5 tabular-nums text-white/20">({genResults.length})</span>
            </p>
            <button
              type="button"
              onClick={() => setGenResults([])}
              className="text-[9px] text-white/25 hover:text-white/50 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className={`grid gap-4 ${
            genResults.length === 4
              ? "grid-cols-2 sm:grid-cols-4"
              : genResults.length === 1
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-2"
          }`}>
            {genResults.map((img) => (
              <GeneratedCard key={img.assetId} img={img} prompt={builtPrompt} />
            ))}
          </div>
        </div>
      )}

      {/* Loading state placeholder */}
      {isGenerating && genResults.length === 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {Array.from({ length: genCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] aspect-video animate-pulse flex items-center justify-center"
            >
              <p className="text-[10px] text-white/20">Generating…</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
