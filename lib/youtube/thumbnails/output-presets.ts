import type { DalleSize } from "@/lib/image-generation/types"
import type { ThumbnailOutputMeta } from "./types"

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlatformPresetKey =
  | 'yt-thumbnail' | 'yt-banner' | 'yt-shorts'
  | 'ig-post' | 'ig-portrait' | 'ig-reel'
  | 'fb-post' | 'fb-square' | 'fb-story'
  | 'tiktok' | 'x-post'
  | 'spotify' | 'apple-music' | 'soundcloud' | 'audiomack' | 'tidal' | 'dsp-standard'
  | 'web-hero' | 'ultrawide'
  | 'custom'

export type Orientation  = 'horizontal' | 'vertical' | 'square'
export type QualityLevel = 'draft' | 'standard' | 'high' | 'ultra'
export type StudioMode   = 'thumbnail' | 'cover-art'

export interface PlatformPresetDef {
  key:         PlatformPresetKey
  label:       string
  group:       string
  width:       number
  height:      number
  aspectRatio: string
  orientation: Orientation
  dalleSize:   DalleSize
  mjAr:        string
}

export interface OutputSettings {
  platformPreset: PlatformPresetKey
  width:          number
  height:         number
  aspectRatio:    string
  orientation:    Orientation
  qualityLevel:   QualityLevel
  autoUpscale:    boolean
  multiPlatform:  boolean
  studioMode:     StudioMode
  coverArtStyle?: string
  customWidth?:   number
  customHeight?:  number
}

// ─── Preset data ──────────────────────────────────────────────────────────────

export const PLATFORM_PRESETS: PlatformPresetDef[] = [
  // YouTube
  { key: 'yt-thumbnail', label: 'YouTube Thumbnail',  group: 'YouTube',   width: 1280, height: 720,  aspectRatio: '16:9', orientation: 'horizontal', dalleSize: '1792x1024', mjAr: '16:9' },
  { key: 'yt-banner',    label: 'YouTube Banner',      group: 'YouTube',   width: 2560, height: 1440, aspectRatio: '16:9', orientation: 'horizontal', dalleSize: '1792x1024', mjAr: '16:9' },
  { key: 'yt-shorts',    label: 'YouTube Shorts',      group: 'YouTube',   width: 1080, height: 1920, aspectRatio: '9:16', orientation: 'vertical',   dalleSize: '1024x1792', mjAr: '9:16' },
  // Social
  { key: 'ig-post',      label: 'Instagram Post',      group: 'Social',    width: 1080, height: 1080, aspectRatio: '1:1',  orientation: 'square',     dalleSize: '1024x1024', mjAr: '1:1' },
  { key: 'ig-portrait',  label: 'Instagram Portrait',  group: 'Social',    width: 1080, height: 1350, aspectRatio: '4:5',  orientation: 'vertical',   dalleSize: '1024x1792', mjAr: '4:5' },
  { key: 'ig-reel',      label: 'Instagram Reel',      group: 'Social',    width: 1080, height: 1920, aspectRatio: '9:16', orientation: 'vertical',   dalleSize: '1024x1792', mjAr: '9:16' },
  { key: 'fb-post',      label: 'Facebook Post',       group: 'Social',    width: 1200, height: 630,  aspectRatio: '16:9', orientation: 'horizontal', dalleSize: '1792x1024', mjAr: '16:9' },
  { key: 'fb-square',    label: 'Facebook Square',     group: 'Social',    width: 1080, height: 1080, aspectRatio: '1:1',  orientation: 'square',     dalleSize: '1024x1024', mjAr: '1:1' },
  { key: 'fb-story',     label: 'Facebook Story',      group: 'Social',    width: 1080, height: 1920, aspectRatio: '9:16', orientation: 'vertical',   dalleSize: '1024x1792', mjAr: '9:16' },
  { key: 'tiktok',       label: 'TikTok',              group: 'Social',    width: 1080, height: 1920, aspectRatio: '9:16', orientation: 'vertical',   dalleSize: '1024x1792', mjAr: '9:16' },
  { key: 'x-post',       label: 'X (Twitter)',         group: 'Social',    width: 1600, height: 900,  aspectRatio: '16:9', orientation: 'horizontal', dalleSize: '1792x1024', mjAr: '16:9' },
  // Streaming / DSP — generated at 1024×1024, tagged "upscale needed" to reach 3000×3000
  { key: 'spotify',      label: 'Spotify Cover',       group: 'Streaming', width: 3000, height: 3000, aspectRatio: '1:1',  orientation: 'square',     dalleSize: '1024x1024', mjAr: '1:1' },
  { key: 'apple-music',  label: 'Apple Music Cover',   group: 'Streaming', width: 3000, height: 3000, aspectRatio: '1:1',  orientation: 'square',     dalleSize: '1024x1024', mjAr: '1:1' },
  { key: 'soundcloud',   label: 'SoundCloud Cover',    group: 'Streaming', width: 3000, height: 3000, aspectRatio: '1:1',  orientation: 'square',     dalleSize: '1024x1024', mjAr: '1:1' },
  { key: 'audiomack',    label: 'Audiomack',           group: 'Streaming', width: 3000, height: 3000, aspectRatio: '1:1',  orientation: 'square',     dalleSize: '1024x1024', mjAr: '1:1' },
  { key: 'tidal',        label: 'Tidal',               group: 'Streaming', width: 3000, height: 3000, aspectRatio: '1:1',  orientation: 'square',     dalleSize: '1024x1024', mjAr: '1:1' },
  { key: 'dsp-standard', label: 'DSP Standard',        group: 'Streaming', width: 3000, height: 3000, aspectRatio: '1:1',  orientation: 'square',     dalleSize: '1024x1024', mjAr: '1:1' },
  // Banners
  { key: 'web-hero',     label: 'Website Hero',        group: 'Banners',   width: 1920, height: 1080, aspectRatio: '16:9', orientation: 'horizontal', dalleSize: '1792x1024', mjAr: '16:9' },
  { key: 'ultrawide',    label: 'Ultra Wide',          group: 'Banners',   width: 2560, height: 1080, aspectRatio: '21:9', orientation: 'horizontal', dalleSize: '1792x1024', mjAr: '21:9' },
  // Custom
  { key: 'custom',       label: 'Custom',              group: 'Custom',    width: 1280, height: 720,  aspectRatio: '16:9', orientation: 'horizontal', dalleSize: '1792x1024', mjAr: '16:9' },
]

export const PRESET_GROUPS = ['YouTube', 'Social', 'Streaming', 'Banners', 'Custom'] as const

export const DEFAULT_OUTPUT_SETTINGS: OutputSettings = {
  platformPreset: 'yt-thumbnail',
  width:          1280,
  height:         720,
  aspectRatio:    '16:9',
  orientation:    'horizontal',
  qualityLevel:   'standard',
  autoUpscale:    false,
  multiPlatform:  false,
  studioMode:     'thumbnail',
}

export const COVER_ART_OUTPUT_DEFAULTS: Partial<OutputSettings> = {
  platformPreset: 'dsp-standard',
  width:          3000,
  height:         3000,
  aspectRatio:    '1:1',
  orientation:    'square',
  qualityLevel:   'high',
}

// Four presets generated in multi-platform mode
export const MULTI_PLATFORM_KEYS: PlatformPresetKey[] = [
  'yt-thumbnail',
  'yt-shorts',
  'ig-post',
  'dsp-standard',
]

export const COVER_ART_STYLE_PRESETS = [
  'Clean Minimal',
  'Cinematic Portrait',
  'Abstract / Texture',
  'Luxury / High Fashion',
  'Street Album Cover',
  'Dark Moody',
  'Bright Pop',
  'Experimental',
] as const
export type CoverArtStylePreset = typeof COVER_ART_STYLE_PRESETS[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Actual pixel dimensions each DALL-E size string produces */
export const DALLE_DIMENSIONS: Record<DalleSize, { width: number; height: number }> = {
  '1024x1024': { width: 1024, height: 1024 },
  '1792x1024': { width: 1792, height: 1024 },
  '1024x1792': { width: 1024, height: 1792 },
}

export function getPreset(key: PlatformPresetKey): PlatformPresetDef {
  return PLATFORM_PRESETS.find((p) => p.key === key) ?? PLATFORM_PRESETS[0]
}

export function qualityToDalle(level: QualityLevel): "standard" | "hd" {
  return level === 'draft' ? 'standard' : 'hd'
}

/** Cover art must be at least High quality. Returns the coerced level. */
export function enforceCoverArtQuality(level: QualityLevel, isCoverArt: boolean): QualityLevel {
  if (!isCoverArt) return level
  return level === 'draft' || level === 'standard' ? 'high' : level
}

export function orientationToCompositionHint(orientation: Orientation): string {
  if (orientation === 'vertical') return 'vertical composition, portrait format'
  if (orientation === 'square')   return 'square composition, centered format'
  return 'horizontal cinematic frame, wide composition'
}

/** Builds the full ThumbnailOutputMeta object used everywhere output settings are stored. */
export function buildOutputMeta(params: {
  outputSettings:  OutputSettings
  dalleSize:       DalleSize
  coverArtStyle?:  string
  compositionHint: string
}): ThumbnailOutputMeta {
  const { outputSettings, dalleSize, coverArtStyle, compositionHint } = params
  const preset    = getPreset(outputSettings.platformPreset)
  const generated = DALLE_DIMENSIONS[dalleSize]

  const platformLabel = outputSettings.platformPreset === 'custom'
    ? `Custom ${outputSettings.customWidth ?? outputSettings.width}×${outputSettings.customHeight ?? outputSettings.height}`
    : preset.label

  const isCoverArt = outputSettings.studioMode === 'cover-art'
  const effectiveQuality = enforceCoverArtQuality(outputSettings.qualityLevel, isCoverArt)

  return {
    mode:                   outputSettings.studioMode,
    platformPreset:         outputSettings.platformPreset,
    platformLabel,
    aspectRatio:            outputSettings.aspectRatio,
    orientation:            outputSettings.orientation,
    requestedWidth:         outputSettings.width,
    requestedHeight:        outputSettings.height,
    generatedWidth:         generated.width,
    generatedHeight:        generated.height,
    // finalExport = requested when upscale is pending; = generated until then
    finalExportWidth:       outputSettings.width,
    finalExportHeight:      outputSettings.height,
    qualityLevel:           effectiveQuality,
    upscaleRequested:       outputSettings.autoUpscale,
    upscaleApplied:         false,
    multiPlatformRequested: outputSettings.multiPlatform,
    coverArtStyle:          coverArtStyle || undefined,
    compositionHint,
  }
}

/** Short label shown on version cards: "YouTube Thumbnail · 1280×720 · 16:9" */
export function formatVersionLabel(meta: ThumbnailOutputMeta): string {
  return `${meta.platformLabel} · ${meta.requestedWidth}×${meta.requestedHeight} · ${meta.aspectRatio}`
}
