"use client"

import { useAudioPlayer } from "@/lib/player/context"

export function QueueDrawer() {
  const { queue, currentIndex, playAtIndex, toggleQueue } = useAudioPlayer()

  return (
    <div className="fixed bottom-16 right-0 z-[99] w-full sm:w-80 max-h-[55vh] flex flex-col bg-[#0c0d12]/97 backdrop-blur-md border-t border-l border-white/[0.08] shadow-2xl shadow-black/80 lg:right-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
          Queue · {queue.length} track{queue.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={toggleQueue}
          className="text-white/25 hover:text-white/60 transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      {/* Track list */}
      <div className="overflow-y-auto flex-1">
        {queue.length === 0 ? (
          <p className="text-[10px] text-white/25 text-center py-6">Queue is empty</p>
        ) : (
          queue.map((track, i) => {
            const isCurrent = i === currentIndex
            return (
              <button
                key={`${track.id}-${i}`}
                onClick={() => playAtIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isCurrent
                    ? "bg-white/[0.06] hover:bg-white/[0.08]"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <span className="text-[9px] tabular-nums text-white/20 w-4 shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs truncate ${isCurrent ? "text-white/90" : "text-white/50"}`}>
                    {track.title}
                  </p>
                  {track.producer && (
                    <p className="text-[9px] text-white/25 truncate mt-0.5">{track.producer}</p>
                  )}
                </div>
                {isCurrent && (
                  <span className="text-[8px] text-violet-400/70 shrink-0 font-medium">playing</span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
