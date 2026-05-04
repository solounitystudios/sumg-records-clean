"use client"

import { buildCanvasPreviewStyle } from "@/lib/youtube/thumbnails/renderCanvas"
import type { CanvasConfig, ThumbnailPreset } from "@/lib/youtube/thumbnails/types"

const TEXT_POSITIONS: Array<{ value: CanvasConfig['titlePosition']; label: string }> = [
  { value: 'top-left',     label: 'TL' },
  { value: 'top-right',    label: 'TR' },
  { value: 'bottom-left',  label: 'BL' },
  { value: 'bottom-right', label: 'BR' },
  { value: 'center',       label: 'C' },
]

const OVERLAYS: Array<{ value: CanvasConfig['overlay']; label: string }> = [
  { value: 'none',                label: 'None' },
  { value: 'soft-black-gradient', label: 'Black Grad' },
  { value: 'cold-blue-vignette',  label: 'Blue Vignette' },
  { value: 'warm-vignette',       label: 'Warm Vignette' },
]

const LOGO_POSITIONS: Array<{ value: CanvasConfig['logoPosition']; label: string }> = [
  { value: 'top-left',     label: 'TL' },
  { value: 'top-right',    label: 'TR' },
  { value: 'bottom-left',  label: 'BL' },
  { value: 'bottom-right', label: 'BR' },
  { value: 'none',         label: 'Off' },
]

interface Props {
  config: CanvasConfig
  selectedImageUrl?: string
  preset?: ThumbnailPreset | null
  onChange: (config: CanvasConfig) => void
}

export function ThumbnailCanvas({ config, selectedImageUrl, onChange }: Props) {
  const { containerStyle, overlayStyle, titleStyle, titlePosition, logoPosition } =
    buildCanvasPreviewStyle(config, selectedImageUrl)

  function set<K extends keyof CanvasConfig>(key: K, value: CanvasConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* 16:9 Preview — sticky so it stays visible as controls/versions scroll beneath */}
      <div className="sticky top-0 z-10 bg-[#060810] pb-2">
        <div style={containerStyle as React.CSSProperties}>
          <div style={overlayStyle as React.CSSProperties} />
          {config.titleText && (
            <div style={titlePosition as React.CSSProperties}>
              <span style={titleStyle as React.CSSProperties}>{config.titleText}</span>
            </div>
          )}
          {config.logoPosition !== 'none' && (
            <div style={logoPosition as React.CSSProperties}>
              <div className="bg-white/10 border border-white/20 rounded px-2 py-1 text-[9px] text-white/40 backdrop-blur-sm">
                LOGO
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-3">
        {/* Title text */}
        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-white/30 block mb-1.5">
            Title Text
          </label>
          <input
            type="text"
            value={config.titleText ?? ""}
            onChange={(e) => set("titleText", e.target.value)}
            placeholder="Override title on thumbnail…"
            className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Font size */}
          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-white/30 block mb-1.5">
              Font Size
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={24}
                max={96}
                step={4}
                value={config.fontSize ?? 52}
                onChange={(e) => set("fontSize", Number(e.target.value))}
                className="flex-1 accent-violet-500"
              />
              <span className="text-xs text-white/50 w-8 text-right">{config.fontSize ?? 52}</span>
            </div>
          </div>

          {/* Shadow toggle */}
          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-white/30 block mb-1.5">
              Text Shadow
            </label>
            <button
              type="button"
              onClick={() => set("shadowEnabled", !config.shadowEnabled)}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                config.shadowEnabled
                  ? "border-violet-500/50 bg-violet-500/10 text-white"
                  : "border-white/[0.08] text-white/40 hover:text-white/60"
              }`}
            >
              {config.shadowEnabled ? "On" : "Off"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Text color */}
          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-white/30 block mb-1.5">
              Text Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.textColor ?? "#ffffff"}
                onChange={(e) => set("textColor", e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-white/10 bg-transparent"
              />
              <span className="text-[10px] text-white/40">{config.textColor ?? "#ffffff"}</span>
            </div>
          </div>

          {/* Stroke color */}
          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-white/30 block mb-1.5">
              Stroke / Outline
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.strokeColor ?? "#000000"}
                onChange={(e) => set("strokeColor", e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-white/10 bg-transparent"
              />
              <span className="text-[10px] text-white/40">{config.strokeColor ?? "#000000"}</span>
            </div>
          </div>
        </div>

        {/* Text position */}
        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-white/30 block mb-1.5">
            Text Position
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {TEXT_POSITIONS.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => set("titlePosition", p.value)}
                className={`px-2.5 py-1 rounded text-[10px] border transition-colors ${
                  config.titlePosition === p.value
                    ? "border-violet-500/60 bg-violet-500/15 text-white"
                    : "border-white/[0.08] text-white/40 hover:text-white/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overlay */}
        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-white/30 block mb-1.5">
            Overlay
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {OVERLAYS.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => set("overlay", o.value)}
                className={`px-2.5 py-1 rounded text-[10px] border transition-colors ${
                  config.overlay === o.value
                    ? "border-violet-500/60 bg-violet-500/15 text-white"
                    : "border-white/[0.08] text-white/40 hover:text-white/60"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logo position */}
        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-white/30 block mb-1.5">
            Logo Position
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {LOGO_POSITIONS.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => set("logoPosition", p.value)}
                className={`px-2.5 py-1 rounded text-[10px] border transition-colors ${
                  config.logoPosition === p.value
                    ? "border-violet-500/60 bg-violet-500/15 text-white"
                    : "border-white/[0.08] text-white/40 hover:text-white/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
