"use client"

import type { ReactNode } from "react"
import { AudioPlayerProvider } from "@/lib/player/context"
import { GlobalAudioPlayer } from "@/components/admin/player/GlobalAudioPlayer"

export function AdminPlayerShell({ children }: { children: ReactNode }) {
  return (
    <AudioPlayerProvider>
      {/* Bottom padding keeps content clear of the 56px-tall player bar */}
      <div className="flex-1 min-w-0 lg:ml-56 pt-12 lg:pt-0 pb-16">
        {children}
      </div>
      <GlobalAudioPlayer />
    </AudioPlayerProvider>
  )
}
