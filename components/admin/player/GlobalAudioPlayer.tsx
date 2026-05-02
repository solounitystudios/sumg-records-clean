"use client"

import { useAudioPlayer } from "@/lib/player/context"
import { QueueDrawer } from "./QueueDrawer"

function fmt(secs: number): string {
  if (!isFinite(secs) || isNaN(secs) || secs < 0) return "0:00"
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export function GlobalAudioPlayer() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, isQueueOpen, queue, currentIndex,
    togglePlay, next, prev, seekTo, setVol, toggleQueue,
  } = useAudioPlayer()

  if (!currentTrack) return null

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0
  const canPrev  = currentIndex > 0
  const canNext  = currentIndex < queue.length - 1

  function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    seekTo(((e.clientX - rect.left) / rect.width) * duration)
  }

  return (
    <>
      {isQueueOpen && <QueueDrawer />}

      {/* ── Player bar ─────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#09090f]/96 backdrop-blur-md border-t border-white/[0.08] lg:pl-56">

        {/* Desktop row */}
        <div className="hidden sm:flex items-center gap-3 px-4 h-14">

          {/* Transport */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={prev}
              disabled={!canPrev}
              title="Previous"
              className="w-7 h-7 flex items-center justify-center text-[10px] text-white/35 hover:text-white/80 disabled:opacity-20 transition-colors"
            >
              ◀◀
            </button>
            <button
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={next}
              disabled={!canNext}
              title="Next"
              className="w-7 h-7 flex items-center justify-center text-[10px] text-white/35 hover:text-white/80 disabled:opacity-20 transition-colors"
            >
              ▶▶
            </button>
          </div>

          {/* Track info */}
          <div className="min-w-0 w-44 shrink-0">
            <p className="text-xs font-medium text-white/80 truncate leading-tight">{currentTrack.title}</p>
            {currentTrack.producer && (
              <p className="text-[9px] text-white/30 truncate mt-0.5">{currentTrack.producer}</p>
            )}
          </div>

          {/* Progress */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-[9px] text-white/25 tabular-nums w-8 text-right shrink-0">{fmt(currentTime)}</span>
            <div
              className="flex-1 relative h-1.5 bg-white/10 rounded-full cursor-pointer group"
              onClick={handleBarClick}
            >
              <div
                className="absolute top-0 left-0 h-full bg-white/55 rounded-full pointer-events-none"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `${progress}%`, transform: "translateX(-50%) translateY(-50%)" }}
              />
            </div>
            <span className="text-[9px] text-white/25 tabular-nums w-8 shrink-0">{fmt(duration)}</span>
          </div>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0 w-28">
            <span className="text-[10px] text-white/25 shrink-0">
              {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVol(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-white cursor-pointer"
            />
          </div>

          {/* Queue */}
          <button
            onClick={toggleQueue}
            className={`shrink-0 text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
              isQueueOpen
                ? "border-white/25 text-white/80 bg-white/[0.07]"
                : "border-white/[0.08] text-white/25 hover:border-white/20 hover:text-white/50"
            }`}
          >
            ☰ {queue.length}
          </button>
        </div>

        {/* Mobile layout (two rows) */}
        <div className="sm:hidden px-3 pt-2 pb-2">
          {/* Row 1: transport + title */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <button
              onClick={prev}
              disabled={!canPrev}
              className="text-[10px] text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
            >◀◀</button>
            <button
              onClick={togglePlay}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white text-xs"
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={next}
              disabled={!canNext}
              className="text-[10px] text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors"
            >▶▶</button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white/80 truncate">{currentTrack.title}</p>
              {currentTrack.producer && (
                <p className="text-[9px] text-white/30 truncate">{currentTrack.producer}</p>
              )}
            </div>
            <button
              onClick={toggleQueue}
              className="text-[10px] text-white/25 hover:text-white/50 shrink-0"
            >
              ☰
            </button>
          </div>
          {/* Row 2: progress */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/20 tabular-nums shrink-0">{fmt(currentTime)}</span>
            <div
              className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer"
              onClick={handleBarClick}
            >
              <div
                className="h-full bg-white/45 rounded-full pointer-events-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] text-white/20 tabular-nums shrink-0">{fmt(duration)}</span>
          </div>
        </div>
      </div>
    </>
  )
}
