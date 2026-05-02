import type { ThumbnailPreset } from './types'

export const NIGHTWIRE_PRESETS: ThumbnailPreset[] = [
  {
    id: 'local-nightwire-mindloft',
    preset_slug: 'nightwire-mindloft',
    producer_slug: 'nightwire',
    name: 'NightWire — MindLoft',
    description: 'Hidden private lofts, strange luxury, Black creative society, smoke, jazz psychedelic trap.',
    canvas_defaults: {
      textPosition: 'bottom-left',
      logoPosition: 'bottom-right',
      overlay: 'soft-black-gradient',
      fontStyle: 'bold-condensed',
      textColor: '#f5f0e8',
      strokeColor: '#1a0a2e',
      fontSize: 52,
    },
    prompt_defaults: {
      style_bucket: 'MindLoft Sessions',
      camera: 'disposable flash photography',
      colors: ['purple', 'gold', 'black'],
      mood: ['hidden luxury', 'private culture', 'jazz psychedelic'],
    },
    active: true,
  },
  {
    id: 'local-nightwire-buffalo-noir',
    preset_slug: 'nightwire-buffalo-noir',
    producer_slug: 'nightwire',
    name: 'NightWire — Buffalo Noir',
    description: 'Route 33, wet asphalt, Buffalo lights, VHS movement, late-night dangerous calm.',
    canvas_defaults: {
      textPosition: 'top-left',
      logoPosition: 'bottom-right',
      overlay: 'cold-blue-vignette',
      fontStyle: 'bold-industrial',
      textColor: '#e8f0ff',
      strokeColor: '#050a0d',
      fontSize: 56,
    },
    prompt_defaults: {
      style_bucket: 'Buffalo Noir',
      camera: 'VHS camcorder',
      colors: ['navy', 'wet asphalt', 'purple neon'],
      mood: ['late night', 'dangerous calm', 'city motion'],
    },
    active: true,
  },
  {
    id: 'local-nightwire-jazz-smoke',
    preset_slug: 'nightwire-jazz-smoke',
    producer_slug: 'nightwire',
    name: 'NightWire — Jazz Smoke',
    description: 'Jazz rooms, red velvet, smoke, emotional loneliness, elegant underground music energy.',
    canvas_defaults: {
      textPosition: 'bottom-left',
      logoPosition: 'top-right',
      overlay: 'warm-vignette',
      fontStyle: 'serif-italic',
      textColor: '#ffe8cc',
      strokeColor: '#0d0205',
      fontSize: 48,
    },
    prompt_defaults: {
      style_bucket: 'Jazz Smoke',
      camera: '35mm film grain',
      colors: ['crimson', 'deep purple', 'tungsten yellow'],
      mood: ['emotional', 'rare', 'jazz underground'],
    },
    active: true,
  },
  {
    id: 'local-nightwire-harlem-private-society',
    preset_slug: 'nightwire-harlem-private-society',
    producer_slug: 'nightwire',
    name: 'NightWire — Harlem Private Society',
    description: 'Brownstones, lofts, private parties, secret cultural rooms, warm flash, elite underground.',
    canvas_defaults: {
      textPosition: 'bottom-right',
      logoPosition: 'top-left',
      overlay: 'soft-black-gradient',
      fontStyle: 'bold-condensed',
      textColor: '#ffffff',
      strokeColor: '#1a0a2e',
      fontSize: 50,
    },
    prompt_defaults: {
      style_bucket: 'Harlem Private Society',
      camera: 'magazine editorial flash',
      colors: ['warm gold', 'emerald', 'black'],
      mood: ['exclusive', 'cultural', 'stylish chaos'],
    },
    active: true,
  },
]

export function getPresetsForProducer(slug: string): ThumbnailPreset[] {
  const PRESETS_BY_PRODUCER: Record<string, ThumbnailPreset[]> = {
    nightwire: NIGHTWIRE_PRESETS,
  }
  return PRESETS_BY_PRODUCER[slug] ?? []
}

export function getPresetBySlug(slug: string): ThumbnailPreset | undefined {
  return NIGHTWIRE_PRESETS.find((p) => p.preset_slug === slug)
}
