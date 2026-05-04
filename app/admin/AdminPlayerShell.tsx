"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { AudioPlayerProvider } from "@/lib/player/context"
import { GlobalAudioPlayer } from "@/components/admin/player/GlobalAudioPlayer"

export function AdminPlayerShell({ children }: { children: ReactNode }) {
  const [compact, setCompact] = useState(false)

  // Restore initial compact state from localStorage (same key as sidebar)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sumg-admin-sidebar-v2")
      if (raw) {
        const parsed = JSON.parse(raw) as { compact?: boolean }
        setCompact(parsed.compact ?? false)
      }
    } catch {
      // ignore
    }
  }, [])

  // Listen for sidebar compact toggle events
  useEffect(() => {
    function handleCompact(e: Event) {
      const detail = (e as CustomEvent<{ compact: boolean }>).detail
      setCompact(detail.compact)
    }
    window.addEventListener("sidebar:compact", handleCompact)
    return () => window.removeEventListener("sidebar:compact", handleCompact)
  }, [])

  return (
    <AudioPlayerProvider>
      {/* Bottom padding keeps content clear of the 56px-tall player bar */}
      <div
        className={`flex-1 min-w-0 pt-12 lg:pt-0 pb-16 transition-all duration-200 ${
          compact ? "lg:ml-14" : "lg:ml-56"
        }`}
      >
        {children}
      </div>
      <GlobalAudioPlayer />
    </AudioPlayerProvider>
  )
}
