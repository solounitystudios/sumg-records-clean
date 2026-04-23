"use client";

import { useState, useTransition } from "react";
import { refreshArtistSpotifySnapshot } from "@/app/actions/spotify";
import { formatFollowers } from "@/lib/spotifyFormat";

interface SpotifyRefreshButtonProps {
  artistSlug: string;
}

export function SpotifyRefreshButton({ artistSlug }: SpotifyRefreshButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    followers?: number;
    error?: string;
  } | null>(null);

  function handleRefresh() {
    setFeedback(null);
    startTransition(async () => {
      const res = await refreshArtistSpotifySnapshot(artistSlug);
      setFeedback(res);
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isPending}
        className="text-[10px] tracking-[0.15em] uppercase border border-white/10 text-white/30 px-3 py-1.5 hover:border-white/25 hover:text-white/60 transition-colors disabled:opacity-40 whitespace-nowrap"
      >
        {isPending ? "Syncing…" : "Sync"}
      </button>
      {feedback?.ok && feedback.followers !== undefined && (
        <span className="text-[10px] text-[#1DB954]/60 whitespace-nowrap">
          ✓ {formatFollowers(feedback.followers)}
        </span>
      )}
      {feedback && !feedback.ok && feedback.error && (
        <span className="text-[10px] text-red-400/60 max-w-[120px] truncate">
          {feedback.error}
        </span>
      )}
    </div>
  );
}
