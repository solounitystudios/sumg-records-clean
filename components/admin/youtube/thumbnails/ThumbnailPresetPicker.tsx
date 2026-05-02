"use client"

import type { ThumbnailPreset } from "@/lib/youtube/thumbnails/types"

interface Props {
  presets: ThumbnailPreset[]
  selectedSlug: string | null
  onSelect: (preset: ThumbnailPreset) => void
}

export function ThumbnailPresetPicker({ presets, selectedSlug, onSelect }: Props) {
  if (presets.length === 0) return null

  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.18em] text-white/30 mb-2">Presets</p>
      <div className="flex flex-col gap-1.5">
        {presets.map((preset) => {
          const active = preset.preset_slug === selectedSlug
          return (
            <button
              key={preset.preset_slug}
              onClick={() => onSelect(preset)}
              className={`text-left px-3 py-2.5 rounded-xl border transition-colors duration-150 ${
                active
                  ? "border-violet-500/50 bg-violet-500/10 text-white"
                  : "border-white/[0.07] bg-white/[0.02] text-white/50 hover:text-white/75 hover:border-white/15"
              }`}
            >
              <p className="text-[11px] font-medium">{preset.name}</p>
              {preset.description && (
                <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{preset.description}</p>
              )}
              {preset.prompt_defaults.style_bucket && (
                <p className="text-[9px] text-violet-400/60 mt-1 uppercase tracking-wide">
                  {preset.prompt_defaults.style_bucket}
                </p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
