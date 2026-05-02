"use client"

import { useState } from "react"
import { buildThumbnailPrompt } from "@/lib/youtube/thumbnails/prompts"
import { savePromptToLibrary } from "@/lib/youtube/thumbnails/actions"
import type { ThumbnailPreset, ThumbnailPromptRow } from "@/lib/youtube/thumbnails/types"

const MOODS = [
  "mysterious and culturally elite",
  "dangerous calm",
  "jazz psychedelic elegance",
  "private culture and rare access",
  "nostalgic and emotionally rich",
  "weird but tasteful",
  "cinematic loneliness",
  "stylish creative chaos",
  "strange luxury and hidden power",
]

const SCENE_TYPES = [
  "private Harlem loft",
  "Buffalo Route 33 at night",
  "museum hallway after hours",
  "luxury townhouse kitchen",
  "underground parking garage",
  "jazz club after closing time",
  "Buffalo rooftop at sunset",
  "Harlem brownstone poker room",
  "private villa backyard",
  "hidden lounge",
  "backseat driving at night",
  "dim recording space",
  "corner store at midnight",
]

const CAMERA_STYLES = [
  "disposable flash camera",
  "35mm film grain",
  "VHS camcorder",
  "old iPhone footage",
  "CCTV security camera",
  "Arri Alexa cinematic",
  "paparazzi zoom lens",
  "magazine editorial flash",
  "macro close-up",
  "backseat POV camera",
]

interface Props {
  producerSlug: string
  jobTitle: string | null
  preset: ThumbnailPreset | null
  savedPrompts: ThumbnailPromptRow[]
  onPromptBuilt: (prompt: string) => void
}

export function ThumbnailPromptPanel({
  producerSlug,
  jobTitle,
  preset,
  savedPrompts,
  onPromptBuilt,
}: Props) {
  const [mood, setMood]   = useState(preset?.prompt_defaults.mood?.[0] ?? "")
  const [scene, setScene] = useState("")
  const [camera, setCamera] = useState(preset?.prompt_defaults.camera ?? "")
  const [builtPrompt, setBuiltPrompt] = useState("")
  const [copied, setCopied]           = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  function handleBuild() {
    const prompt = buildThumbnailPrompt({
      producerSlug,
      title:       jobTitle ?? undefined,
      mood:        mood || undefined,
      sceneType:   scene || undefined,
      cameraStyle: camera || undefined,
      presetSlug:  preset?.preset_slug,
    })
    setBuiltPrompt(prompt)
    onPromptBuilt(prompt)
    setSaved(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(builtPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave() {
    if (!builtPrompt) return
    setSaving(true)
    await savePromptToLibrary(
      producerSlug,
      builtPrompt,
      "studio-generated",
      preset?.prompt_defaults.style_bucket,
    )
    setSaving(false)
    setSaved(true)
  }

  function handleUseLibraryPrompt(p: ThumbnailPromptRow) {
    setBuiltPrompt(p.prompt)
    onPromptBuilt(p.prompt)
    setSaved(false)
  }

  return (
    <div className="space-y-4">
      {/* Dropdowns */}
      <div className="space-y-2.5">
        <div>
          <label className="text-[9px] uppercase tracking-[0.18em] text-white/30 block mb-1">
            Mood
          </label>
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none"
          >
            <option value="">— Auto —</option>
            {MOODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[9px] uppercase tracking-[0.18em] text-white/30 block mb-1">
            Scene
          </label>
          <select
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none"
          >
            <option value="">— Auto from title —</option>
            {SCENE_TYPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[9px] uppercase tracking-[0.18em] text-white/30 block mb-1">
            Camera Style
          </label>
          <select
            value={camera}
            onChange={(e) => setCamera(e.target.value)}
            className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none"
          >
            <option value="">— Auto from preset —</option>
            {CAMERA_STYLES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleBuild}
        className="w-full py-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-medium transition-colors"
      >
        Build Prompt
      </button>

      {/* Built prompt display */}
      {builtPrompt && (
        <div className="space-y-2">
          <label className="text-[9px] uppercase tracking-[0.18em] text-white/30 block">
            Generated Prompt
          </label>
          <textarea
            value={builtPrompt}
            onChange={(e) => setBuiltPrompt(e.target.value)}
            rows={5}
            className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-violet-500/50 resize-none font-mono leading-relaxed"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-1.5 rounded-lg border border-white/[0.08] text-xs text-white/50 hover:text-white hover:border-white/20 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="flex-1 py-1.5 rounded-lg border border-white/[0.08] text-xs text-white/50 hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save to Library"}
            </button>
          </div>
          <p className="text-[10px] text-white/25 text-center">
            Paste into Midjourney / DALL-E → download → add URL below
          </p>
        </div>
      )}

      {/* Library prompts */}
      {savedPrompts.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/30 mb-2">
            Saved Library
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {savedPrompts.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => handleUseLibraryPrompt(p)}
                className="w-full text-left px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/15 transition-colors"
              >
                <p className="text-[10px] text-white/50 line-clamp-2">{p.prompt}</p>
                {p.style_bucket && (
                  <p className="text-[9px] text-violet-400/50 mt-0.5">{p.style_bucket}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
