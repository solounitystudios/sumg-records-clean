"use client"

import { useAudioPlayer } from "@/lib/player/context"
import type { AudioTrack } from "@/lib/player/context"

interface Props {
  track: AudioTrack
  queue?: AudioTrack[]
  className?: string
  size?: "sm" | "md"
}

export function PlayButton({ track, queue, className, size = "sm" }: Props) {
  const { loadAndPlay, isCurrentTrack, isPlaying, togglePlay } = useAudioPlayer()
  const isCurrent = isCurrentTrack(track.id)
  const active    = isCurrent && isPlaying

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (isCurrent) {
      togglePlay()
    } else {
      loadAndPlay(track, queue ?? [track])
    }
  }

  const sizeClass = size === "md"
    ? "w-8 h-8 text-xs"
    : "w-6 h-6 text-[9px]"

  return (
    <button
      onClick={handleClick}
      title={active ? "Pause" : "Play"}
      className={className ?? `flex-shrink-0 flex items-center justify-center rounded border transition-all duration-150 ${sizeClass} ${
        active
          ? "border-violet-400/60 bg-violet-500/20 text-violet-300"
          : "border-white/15 text-white/35 hover:border-white/30 hover:text-white/70 hover:bg-white/[0.04]"
      }`}
    >
      {active ? "■" : "▶"}
    </button>
  )
}
