"use client"

interface Props {
  url: string
}

export function AudioPlayer({ url }: Props) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/30 p-3">
      <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-2">Audio Preview</p>
      <audio
        src={url}
        controls
        className="w-full"
        style={{ colorScheme: "dark", height: "32px" }}
        preload="metadata"
      />
    </div>
  )
}
