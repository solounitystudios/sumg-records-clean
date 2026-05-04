import type { CanvasConfig } from './types'

const OVERLAY_CSS: Record<string, string> = {
  'none':                '',
  'soft-black-gradient': 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
  'cold-blue-vignette':  'radial-gradient(ellipse at center, transparent 40%, rgba(5,10,30,0.85) 100%)',
  'warm-vignette':       'radial-gradient(ellipse at center, transparent 40%, rgba(30,5,5,0.8) 100%)',
}

const POSITION_CSS: Record<string, { top?: string; bottom?: string; left?: string; right?: string; transform?: string }> = {
  'top-left':     { top: '8%',  left: '5%' },
  'top-right':    { top: '8%',  right: '5%' },
  'bottom-left':  { bottom: '10%', left: '5%' },
  'bottom-right': { bottom: '10%', right: '5%' },
  'center':       { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
  'none':         { bottom: '5%', right: '5%' },
}

export function getOverlayCss(overlay?: CanvasConfig['overlay']): string {
  return OVERLAY_CSS[overlay ?? 'none'] ?? ''
}

export function getPositionStyle(
  pos?: CanvasConfig['titlePosition'] | CanvasConfig['logoPosition'],
): React.CSSProperties {
  return (POSITION_CSS[pos ?? 'bottom-left'] ?? POSITION_CSS['bottom-left']) as React.CSSProperties
}

export function buildCanvasPreviewStyle(config: CanvasConfig, imageUrl?: string): {
  containerStyle: React.CSSProperties
  overlayStyle: React.CSSProperties
  titleStyle: React.CSSProperties
  titlePosition: React.CSSProperties
  logoPosition: React.CSSProperties
} {
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    background: imageUrl ? `url(${imageUrl}) center/cover no-repeat` : '#0d1016',
    overflow: 'hidden',
  }

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: getOverlayCss(config.overlay),
    pointerEvents: 'none',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: config.fontSize ? `${config.fontSize}px` : '52px',
    fontWeight: 'bold',
    color: config.textColor ?? '#ffffff',
    textShadow: config.shadowEnabled
      ? `2px 2px 0 ${config.strokeColor ?? '#000'}, -1px -1px 0 ${config.strokeColor ?? '#000'}`
      : 'none',
    WebkitTextStroke: config.strokeColor ? `1px ${config.strokeColor}` : undefined,
    lineHeight: 1.1,
    maxWidth: '80%',
    wordBreak: 'break-word',
  }

  const titlePosition: React.CSSProperties = {
    position: 'absolute',
    zIndex: 2,
    ...getPositionStyle(config.titlePosition),
  }

  const logoPosition: React.CSSProperties = {
    position: 'absolute',
    zIndex: 2,
    ...getPositionStyle(config.logoPosition),
  }

  return { containerStyle, overlayStyle, titleStyle, titlePosition, logoPosition }
}

declare namespace React {
  interface CSSProperties {
    [key: string]: string | number | undefined
  }
}
