"use client"

interface Props {
  url: string
}

export function VideoPreview({ url }: Props) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/30 overflow-hidden">
      <div className="px-3 pt-2.5 pb-1.5">
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Rendered Video</p>
      </div>
      <video
        src={url}
        controls
        className="w-full aspect-video bg-black"
        preload="metadata"
      />
    </div>
  )
}
