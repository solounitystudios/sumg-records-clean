"use client";

/**
 * components/AudioPlayButton.tsx
 *
 * Lightweight inline play/pause toggle for audio previews.
 * Renders nothing when no audioUrl is provided — safe to use
 * unconditionally on every song row.
 *
 * Must stop propagation so it doesn't trigger parent <Link> navigation.
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  audioUrl?: string;
}

export function AudioPlayButton({ audioUrl }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Recreate the Audio instance whenever audioUrl changes; clean up on unmount.
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const onEnded = () => setPlaying(false);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
      setPlaying(false);
    };
  }, [audioUrl]);

  if (!audioUrl) return null;

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {
        // Autoplay may be blocked by browser policy; silently reset state.
        setPlaying(false);
      });
      setPlaying(true);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Pause preview" : "Play preview"}
      className={`flex-shrink-0 flex items-center justify-center w-7 h-7 border transition-all duration-300 text-[9px] ${
        playing
          ? "border-white/50 text-white/90 bg-white/[0.07]"
          : "border-white/15 text-white/35 hover:border-white/40 hover:text-white/70"
      }`}
    >
      {playing ? "■" : "▶"}
    </button>
  );
}
