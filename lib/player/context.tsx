"use client"

import { createContext, useContext, useRef, useState, useEffect, type ReactNode } from "react"

export interface AudioTrack {
  id: string
  url: string
  title: string
  producer?: string | null
  duration?: number | null
  source: "inbox" | "asset" | "song" | "producer-bin"
}

interface PlayerContextValue {
  queue: AudioTrack[]
  currentIndex: number
  currentTrack: AudioTrack | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isQueueOpen: boolean
  loadAndPlay: (track: AudioTrack, newQueue?: AudioTrack[]) => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  seekTo: (time: number) => void
  setVol: (vol: number) => void
  toggleQueue: () => void
  playAtIndex: (index: number) => void
  isCurrentTrack: (id: string) => boolean
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  // Refs mirror state so event-handler closures always read current values
  const queueRef  = useRef<AudioTrack[]>([])
  const indexRef  = useRef(-1)

  const [queue,        setQueueState]  = useState<AudioTrack[]>([])
  const [currentIndex, setIndexState]  = useState(-1)
  const [isPlaying,    setIsPlaying]   = useState(false)
  const [currentTime,  setCurrentTime] = useState(0)
  const [duration,     setDuration]    = useState(0)
  const [volume,       setVolumeState] = useState(0.8)
  const [isQueueOpen,  setIsQueueOpen] = useState(false)

  function syncQueue(q: AudioTrack[]) { queueRef.current = q;  setQueueState(q) }
  function syncIndex(i: number)       { indexRef.current = i;  setIndexState(i) }

  useEffect(() => {
    const audio = new Audio()
    audio.volume = 0.8
    audioRef.current = audio

    const onTime     = () => setCurrentTime(audio.currentTime)
    const onDuration = () => setDuration(isNaN(audio.duration) ? 0 : audio.duration)
    const onPlay     = () => setIsPlaying(true)
    const onPause    = () => setIsPlaying(false)
    const onEnded    = () => {
      const next = indexRef.current + 1
      if (next < queueRef.current.length) {
        playAtIndexInternal(next)
      } else {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }

    audio.addEventListener("timeupdate",     onTime)
    audio.addEventListener("durationchange", onDuration)
    audio.addEventListener("play",           onPlay)
    audio.addEventListener("pause",          onPause)
    audio.addEventListener("ended",          onEnded)

    return () => {
      audio.removeEventListener("timeupdate",     onTime)
      audio.removeEventListener("durationchange", onDuration)
      audio.removeEventListener("play",           onPlay)
      audio.removeEventListener("pause",          onPause)
      audio.removeEventListener("ended",          onEnded)
      audio.pause()
      audioRef.current = null
    }
  // Intentional single-run: audio element is created once; callbacks read from refs, not state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function playAtIndexInternal(idx: number) {
    const q = queueRef.current
    if (idx < 0 || idx >= q.length) return
    const audio = audioRef.current
    if (!audio) return
    syncIndex(idx)
    setCurrentTime(0)
    setDuration(0)
    audio.src = q[idx].url
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  function loadAndPlay(track: AudioTrack, newQueue?: AudioTrack[]) {
    const q = newQueue ?? [track]
    syncQueue(q)
    const idx = q.findIndex((t) => t.id === track.id)
    playAtIndexInternal(Math.max(0, idx))
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio || indexRef.current < 0) return
    audio.paused ? audio.play().catch(() => {}) : audio.pause()
  }

  function next() {
    const n = indexRef.current + 1
    if (n < queueRef.current.length) playAtIndexInternal(n)
  }

  function prev() {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return }
    const p = indexRef.current - 1
    if (p >= 0) playAtIndexInternal(p)
  }

  function seekTo(time: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    setCurrentTime(time)
  }

  function setVol(vol: number) {
    setVolumeState(vol)
    if (audioRef.current) audioRef.current.volume = vol
  }

  function toggleQueue() { setIsQueueOpen((o) => !o) }

  function playAtIndex(idx: number) { playAtIndexInternal(idx) }

  function isCurrentTrack(id: string) {
    return queue[currentIndex]?.id === id
  }

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length
    ? queue[currentIndex]
    : null

  return (
    <PlayerContext.Provider value={{
      queue, currentIndex, currentTrack, isPlaying, currentTime, duration, volume, isQueueOpen,
      loadAndPlay, togglePlay, next, prev, seekTo, setVol, toggleQueue, playAtIndex, isCurrentTrack,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function useAudioPlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error("useAudioPlayer must be used inside AudioPlayerProvider")
  return ctx
}
