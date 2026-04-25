"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import type { DNARecord } from "@/lib/db/dna"
import type { ProducerVariation } from "@/lib/db/dnaPacks"
import { saveDNAPack } from "@/app/actions/dnaPacks"

// ─── Types ────────────────────────────────────────────────────────────────────

type UseCase = "suno" | "youtube_beat" | "cover_art" | "music_video" | "short_reel"

interface GeneratedPack {
  song_prompt: string
  suno_metatags: string
  title_ideas: string
  yt_description: string
  hashtags: string[]
  thumbnail_prompt: string
  visual_direction: string
}

const USE_CASES: { value: UseCase; label: string; platform: string }[] = [
  { value: "suno",         label: "Suno / AI Song",        platform: "suno" },
  { value: "youtube_beat", label: "YouTube Beat Upload",    platform: "youtube_beat" },
  { value: "cover_art",    label: "Cover Art",              platform: "cover_art" },
  { value: "music_video",  label: "Music Video",            platform: "music_video" },
  { value: "short_reel",   label: "Short / Reel",           platform: "short_reel" },
]

const STATUS_OPTIONS = [
  { value: "draft",             label: "Draft" },
  { value: "approved",          label: "Approved" },
  { value: "assigned_to_queue", label: "Assign to Queue" },
] as const

// ─── JSONB field helpers ──────────────────────────────────────────────────────

function jStr(val: unknown, key: string): string {
  if (!val || typeof val !== "object") return ""
  const v = (val as Record<string, unknown>)[key]
  if (typeof v === "string") return v
  if (Array.isArray(v)) return (v as unknown[]).filter((x): x is string => typeof x === "string").join(", ")
  return ""
}

function jArr(val: unknown, key: string): string[] {
  if (!val || typeof val !== "object") return []
  const v = (val as Record<string, unknown>)[key]
  if (Array.isArray(v)) return (v as unknown[]).filter((x): x is string => typeof x === "string")
  return []
}

// ─── Pack generator ───────────────────────────────────────────────────────────

function generatePack(
  artist: DNARecord,
  producer: DNARecord,
  variation: ProducerVariation,
  useCase: UseCase,
): GeneratedPack {
  const tempoInfo =
    jStr(artist.tempo_range, "primary") || jStr(producer.tempo_range, "primary")
  const arrangementDesc = jStr(producer.arrangement_dna, "description")
  const drums     = jArr(producer.instrumentation_rules, "drums").slice(0, 3)
  const bass      = jArr(producer.instrumentation_rules, "bass").slice(0, 2)
  const fxArtist  = jArr(artist.fx_language, "good").slice(0, 4)
  const fxProd    = jArr(producer.fx_language, "good").slice(0, 4)
  const prodVisualWorld  = jArr(producer.visual_dna, "world")
  const prodVisualColors = jArr(producer.visual_dna, "colors")
  const ytThumbnailNotes = jArr(producer.youtube_packaging_dna, "thumbnail")
  const ytPkgDesc        = jStr(producer.youtube_packaging_dna, "description")
  const sunoArtist = jStr(artist.suno_metatag_rules, "notes")
  const sunoProd   = jStr(producer.suno_metatag_rules, "notes")

  // ── song_prompt ────────────────────────────────────────────────────────────
  const forbiddenList = [
    ...variation.forbidden_elements.slice(0, 3),
    ...artist.forbidden_elements.slice(0, 2),
    ...producer.forbidden_elements.slice(0, 2),
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 6)
    .join(", ")

  const sunoTag = useCase === "suno"
    ? `\nSuno style: [${artist.genre_core[0] ?? "rap"}] [${artist.emotional_targets[0] ?? "intense"}]`
    : ""

  const songPromptLines = [
    `${artist.name} × ${producer.name} — ${variation.variation_name}`,
    ``,
    `Vibe: ${artist.emotional_targets.slice(0, 4).join(", ")}`,
    `Genre: ${artist.genre_core.slice(0, 2).join(" / ")}`,
    tempoInfo ? `Tempo: ${tempoInfo}` : "",
    ``,
    `Sound direction: ${variation.sound_direction ?? ""}`,
    arrangementDesc ? `Arrangement: ${arrangementDesc}` : "",
    drums.length ? `Drums: ${drums.join(", ")}` : "",
    bass.length  ? `Bass: ${bass.join(", ")}` : "",
    fxArtist.length || fxProd.length
      ? `FX tags: ${[...fxArtist, ...fxProd].slice(0, 6).join("  ")}`
      : "",
    sunoTag,
    ``,
    forbiddenList ? `Forbidden: ${forbiddenList}` : "",
  ]
    .filter((l) => l !== undefined && l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  // ── suno_metatags ──────────────────────────────────────────────────────────
  const sunoTagBank = variation.tag_bank
    .slice(0, 8)
    .map((t) => `[${t}]`)
    .join(" ")
  const sunoContextParts = [sunoArtist, sunoProd].filter(Boolean)
  const sunoMetatags = [
    sunoTagBank,
    sunoContextParts.length ? `\n\nContext: ${sunoContextParts.join(" | ")}` : "",
  ].join("").trim()

  // ── title_ideas ────────────────────────────────────────────────────────────
  const formula =
    variation.yt_title_formula ??
    `{TRACK} (${variation.variation_name} Beat) — ${producer.name}`
  const exampleTracks = ["COLD FRONT", "SIGNAL BREAK", "MIDNIGHT PRESSURE"]
  const titleIdeas = exampleTracks
    .map((t) => formula.replace("{TRACK}", t).replace("{ARTIST}", artist.name))
    .join("\n")

  // ── yt_description ─────────────────────────────────────────────────────────
  const descStyle = variation.description_style ?? ""
  const ytDescription = [
    producer.brand_positioning ?? `${producer.name} — ${producer.archetype ?? ""}`,
    ``,
    descStyle ? `Direction: ${descStyle}` : "",
    `World: ${variation.visual_world ?? ""}`,
    ytPkgDesc ? `\n${ytPkgDesc}` : "",
    ``,
    `🎧 Produced by ${producer.name}`,
    `📲 Follow on all platforms`,
    ``,
    `Tags: ${variation.tag_bank.join(", ")}`,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  // ── hashtags ───────────────────────────────────────────────────────────────
  const hashtags = [
    ...variation.tag_bank.slice(0, 8).map((t) => `#${t.replace(/\s+/g, "")}`),
    ...artist.metadata_keywords.slice(0, 4).map((k) => `#${k.replace(/\s+/g, "")}`),
    ...producer.metadata_keywords.slice(0, 3).map((k) => `#${k.replace(/\s+/g, "")}`),
  ].filter((v, i, a) => a.indexOf(v) === i)

  // ── thumbnail_prompt ───────────────────────────────────────────────────────
  const thumbColors = variation.colors.length
    ? `Dominant colors: ${variation.colors.join(", ")}.`
    : ""
  const thumbStyle = ytThumbnailNotes.length
    ? `Style notes: ${ytThumbnailNotes.join(", ")}.`
    : ""
  const thumbnailPrompt = [variation.image_prompt, thumbColors, thumbStyle]
    .filter(Boolean)
    .join(" ")
    .trim()

  // ── visual_direction ───────────────────────────────────────────────────────
  const visualDirection = [
    `World: ${variation.visual_world ?? ""}`,
    variation.colors.length ? `Colors: ${variation.colors.join(", ")}` : "",
    prodVisualWorld.length ? `Producer world: ${prodVisualWorld.join(", ")}` : "",
    prodVisualColors.length ? `Producer palette: ${prodVisualColors.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim()

  return {
    song_prompt: songPromptLines,
    suno_metatags: sunoMetatags,
    title_ideas: titleIdeas,
    yt_description: ytDescription,
    hashtags,
    thumbnail_prompt: thumbnailPrompt,
    visual_direction: visualDirection,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyBlock({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [value])

  return (
    <div
      className={`rounded-2xl border bg-[#0d1016] overflow-hidden transition-colors ${
        highlight
          ? "border-white/20"
          : "border-white/[0.07]"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <span className="text-[9px] uppercase tracking-[0.25em] text-white/35 font-semibold">
          {label}
        </span>
        <button
          onClick={copy}
          className={`text-[10px] px-3 py-1 rounded-lg border transition-all ${
            copied
              ? "border-emerald-500/40 text-emerald-400 bg-emerald-400/5"
              : "border-white/10 text-white/35 hover:text-white/70 hover:border-white/20"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className={`px-4 py-3 text-[12px] leading-relaxed text-white/70 whitespace-pre-wrap break-words ${
          mono ? "font-mono" : "font-sans"
        }`}
      >
        {value}
      </pre>
    </div>
  )
}

function HashtagsBlock({ tags }: { tags: string[] }) {
  const [copied, setCopied] = useState(false)
  const text = tags.join(" ")

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <span className="text-[9px] uppercase tracking-[0.25em] text-white/35 font-semibold">
          Hashtags
        </span>
        <button
          onClick={copy}
          className={`text-[10px] px-3 py-1 rounded-lg border transition-all ${
            copied
              ? "border-emerald-500/40 text-emerald-400 bg-emerald-400/5"
              : "border-white/10 text-white/35 hover:text-white/70 hover:border-white/20"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded border border-white/[0.07] text-white/50 font-mono"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Select styles ────────────────────────────────────────────────────────────

const selectClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition appearance-none"

const labelClass =
  "block text-[9px] uppercase tracking-[0.22em] text-white/35 mb-1.5 font-semibold"

// ─── Main builder ─────────────────────────────────────────────────────────────

interface Props {
  artists: DNARecord[]
  producers: DNARecord[]
  variations: ProducerVariation[]
}

export function DNAPackBuilder({ artists, producers, variations }: Props) {
  const [artistId, setArtistId]     = useState("")
  const [producerId, setProducerId] = useState("")
  const [variationId, setVariationId] = useState("")
  const [useCase, setUseCase]       = useState<UseCase>("youtube_beat")
  const [packTitle, setPackTitle]   = useState("")
  const [saveStatus, setSaveStatus] = useState<"draft" | "approved" | "assigned_to_queue">("draft")
  const [saving, setSaving]         = useState(false)
  const [savedId, setSavedId]       = useState<string | null>(null)
  const [saveError, setSaveError]   = useState("")

  const selectedArtist   = useMemo(() => artists.find((a) => a.id === artistId)   ?? null, [artists, artistId])
  const selectedProducer = useMemo(() => producers.find((p) => p.id === producerId) ?? null, [producers, producerId])

  const filteredVariations = useMemo(
    () => (selectedProducer ? variations.filter((v) => v.producer_slug === selectedProducer.slug) : []),
    [variations, selectedProducer],
  )

  const selectedVariation = useMemo(
    () => filteredVariations.find((v) => v.id === variationId) ?? null,
    [filteredVariations, variationId],
  )

  const generated = useMemo<GeneratedPack | null>(
    () =>
      selectedArtist && selectedProducer && selectedVariation
        ? generatePack(selectedArtist, selectedProducer, selectedVariation, useCase)
        : null,
    [selectedArtist, selectedProducer, selectedVariation, useCase],
  )

  const defaultTitle = useMemo(() => {
    if (!selectedArtist || !selectedProducer || !selectedVariation) return ""
    return `${selectedArtist.name} × ${selectedProducer.name} — ${selectedVariation.variation_name}`
  }, [selectedArtist, selectedProducer, selectedVariation])

  const handleProducerChange = (id: string) => {
    setProducerId(id)
    setVariationId("")
  }

  const handleSave = async () => {
    if (!generated || !selectedArtist || !selectedProducer || !selectedVariation) return
    setSaving(true)
    setSaveError("")
    try {
      const platform = USE_CASES.find((u) => u.value === useCase)?.platform ?? useCase
      const result = await saveDNAPack({
        title: packTitle || defaultTitle,
        artist_dna_id: selectedArtist.id,
        producer_dna_id: selectedProducer.id,
        producer_variation_id: selectedVariation.id,
        platform,
        upload_type: useCase,
        song_prompt: generated.song_prompt,
        suno_metatags: generated.suno_metatags,
        title_ideas: generated.title_ideas,
        thumbnail_prompt: generated.thumbnail_prompt,
        yt_description: generated.yt_description,
        hashtags: generated.hashtags,
        visual_direction: generated.visual_direction,
        status: saveStatus,
      })
      setSavedId(result.id)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  // Which blocks are primary for this use case
  const primaryBlocks: Record<UseCase, string[]> = {
    suno:         ["song_prompt", "suno_metatags"],
    youtube_beat: ["title_ideas", "yt_description", "hashtags", "thumbnail_prompt"],
    cover_art:    ["thumbnail_prompt", "visual_direction"],
    music_video:  ["visual_direction", "thumbnail_prompt"],
    short_reel:   ["title_ideas", "hashtags", "thumbnail_prompt"],
  }
  const primary = primaryBlocks[useCase]

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="w-full md:w-72 lg:w-80 shrink-0 space-y-4">

        {/* Selectors card */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 space-y-4">
          <p className="text-[9px] uppercase tracking-[0.25em] text-white/30 font-semibold">
            Build Pack
          </p>

          {/* Artist DNA */}
          <div>
            <label className={labelClass}>Artist DNA</label>
            <select
              className={selectClass}
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
            >
              <option value="">Select artist…</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Producer DNA */}
          <div>
            <label className={labelClass}>Producer DNA</label>
            <select
              className={selectClass}
              value={producerId}
              onChange={(e) => handleProducerChange(e.target.value)}
            >
              <option value="">Select producer…</option>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Variation */}
          <div>
            <label className={labelClass}>Producer Variation</label>
            <select
              className={selectClass}
              value={variationId}
              onChange={(e) => setVariationId(e.target.value)}
              disabled={filteredVariations.length === 0}
            >
              <option value="">
                {producerId
                  ? filteredVariations.length
                    ? "Select variation…"
                    : "No variations for this producer"
                  : "Select producer first"}
              </option>
              {filteredVariations.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.variation_name}
                </option>
              ))}
            </select>
            {selectedVariation && (
              <p className="mt-1.5 text-[10px] text-white/25 leading-relaxed">
                {selectedVariation.visual_world}
              </p>
            )}
          </div>

          {/* Use case */}
          <div>
            <label className={labelClass}>Use Case</label>
            <div className="space-y-1">
              {USE_CASES.map((u) => (
                <button
                  key={u.value}
                  onClick={() => setUseCase(u.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-colors ${
                    useCase === u.value
                      ? "bg-white/10 text-white border border-white/20"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save card — only shown when generated */}
        {generated && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] p-5 space-y-4">
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/30 font-semibold">
              Save Pack
            </p>

            <div>
              <label className={labelClass}>Pack Title</label>
              <input
                type="text"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
                value={packTitle}
                onChange={(e) => setPackTitle(e.target.value)}
                placeholder={defaultTitle}
              />
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <div className="space-y-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSaveStatus(s.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-colors ${
                      saveStatus === s.value
                        ? "bg-white/10 text-white border border-white/20"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {savedId ? (
              <div className="space-y-2">
                <p className="text-[11px] text-emerald-400">Pack saved.</p>
                <Link
                  href="/admin/dna/packs"
                  className="block text-center text-[11px] border border-white/15 text-white/50 hover:text-white/80 px-4 py-2 rounded-xl transition-colors"
                >
                  View in Packs →
                </Link>
                <button
                  onClick={() => setSavedId(null)}
                  className="w-full text-[11px] text-white/30 hover:text-white/55 transition-colors"
                >
                  Save another
                </button>
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50 transition"
              >
                {saving ? "Saving…" : "Save Pack"}
              </button>
            )}

            {saveError && (
              <p className="text-[10px] text-red-400">{saveError}</p>
            )}
          </div>
        )}

        {/* Hint when nothing selected */}
        {!generated && (
          <div className="rounded-2xl border border-dashed border-white/[0.07] p-5 text-center">
            <p className="text-[11px] text-white/20 leading-relaxed">
              Select artist, producer, and variation to generate a pack.
            </p>
          </div>
        )}
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {!generated ? (
          <div className="rounded-2xl border border-dashed border-white/[0.05] p-16 text-center">
            <p className="text-sm text-white/15">
              Generated pack will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Context bar */}
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-[10px] text-white/40 font-medium">
                {selectedArtist!.name}
              </span>
              <span className="text-white/15 text-xs">×</span>
              <span className="text-[10px] text-white/40 font-medium">
                {selectedProducer!.name}
              </span>
              <span className="text-white/15 text-xs">—</span>
              <span className="text-[10px] text-white/40">
                {selectedVariation!.variation_name}
              </span>
              <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full border border-white/10 text-white/30 uppercase tracking-wide">
                {USE_CASES.find((u) => u.value === useCase)?.label}
              </span>
            </div>

            <CopyBlock
              label="Song Prompt"
              value={generated.song_prompt}
              highlight={primary.includes("song_prompt")}
            />

            <CopyBlock
              label="Suno Metatags"
              value={generated.suno_metatags}
              mono
              highlight={primary.includes("suno_metatags")}
            />

            <CopyBlock
              label="YouTube Title Ideas"
              value={generated.title_ideas}
              highlight={primary.includes("title_ideas")}
            />

            <CopyBlock
              label="YouTube Description"
              value={generated.yt_description}
              highlight={primary.includes("yt_description")}
            />

            <HashtagsBlock tags={generated.hashtags} />

            <CopyBlock
              label="Thumbnail Prompt"
              value={generated.thumbnail_prompt}
              highlight={primary.includes("thumbnail_prompt")}
            />

            <CopyBlock
              label="Visual Direction"
              value={generated.visual_direction}
              highlight={primary.includes("visual_direction")}
            />
          </>
        )}
      </div>
    </div>
  )
}
