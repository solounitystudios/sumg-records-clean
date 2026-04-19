"use client";

import { useState } from "react";
import { CMSSong } from "@/lib/types";

interface TracklistEditorProps {
  releaseSlug: string;
  artistSlug: string;
  tracks: CMSSong[];
  onChange: (tracks: CMSSong[]) => void;
}

function generateTrackId() {
  return `track-${Math.random().toString(36).slice(2, 8)}`;
}

export function TracklistEditor({
  releaseSlug,
  artistSlug,
  tracks,
  onChange,
}: TracklistEditorProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("");

  function addTrack() {
    if (!newTitle.trim()) return;
    const track: CMSSong = {
      id: generateTrackId(),
      // slug is auto-derived from title for inline tracklist entries
      slug: newTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + `-${Math.random().toString(36).slice(2, 6)}`,
      title: newTitle.trim(),
      releaseSlug,
      releaseName: undefined,
      artistSlug,
      artistName: artistSlug,
      trackNumber: tracks.length + 1,
      duration: newDuration.trim() || undefined,
      status: "draft",
      isVisible: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onChange([...tracks, track]);
    setNewTitle("");
    setNewDuration("");
    setAdding(false);
  }

  function removeTrack(id: string) {
    const updated = tracks
      .filter((t) => t.id !== id)
      .map((t, i) => ({ ...t, trackNumber: i + 1 }));
    onChange(updated);
  }

  function updateTrack(id: string, field: keyof CMSSong, value: string) {
    onChange(
      tracks.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...tracks];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next.map((t, i) => ({ ...t, trackNumber: i + 1 })));
  }

  function moveDown(index: number) {
    if (index === tracks.length - 1) return;
    const next = [...tracks];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next.map((t, i) => ({ ...t, trackNumber: i + 1 })));
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/30">
          Tracklist — {tracks.length} track{tracks.length !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[10px] tracking-[0.15em] uppercase text-white/30 hover:text-white transition-colors"
        >
          + Add Track
        </button>
      </div>

      {/* Track rows */}
      {tracks.length === 0 && !adding && (
        <p className="text-xs text-white/20 italic py-4 text-center">
          No tracks yet. Add the first track.
        </p>
      )}

      {tracks.map((track, index) => (
        <TrackRow
          key={track.id}
          track={track}
          index={index}
          total={tracks.length}
          onUpdate={updateTrack}
          onRemove={removeTrack}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      ))}

      {/* Add track form */}
      {adding && (
        <div className="border border-white/10 p-4 space-y-3 bg-white/[0.02]">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25">
            New Track
          </p>
          <div className="grid grid-cols-2 gap-3">
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Track title"
              className="bg-transparent border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-white/25 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") addTrack();
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <input
              type="text"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              placeholder="Duration (e.g. 3:24)"
              className="bg-transparent border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-white/25 focus:outline-none font-mono"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addTrack}
              className="text-[10px] tracking-[0.2em] uppercase bg-white text-black px-5 py-2 font-semibold hover:bg-white/90 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewTitle(""); setNewDuration(""); }}
              className="text-[10px] tracking-[0.2em] uppercase text-white/30 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TrackRowProps {
  track: CMSSong;
  index: number;
  total: number;
  onUpdate: (id: string, field: keyof CMSSong, value: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function TrackRow({
  track,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TrackRowProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="group border border-white/[0.06] hover:border-white/10 transition-colors">
      {editing ? (
        <div className="p-3 space-y-2 bg-white/[0.02]">
          <div className="grid grid-cols-2 gap-2">
            <input
              autoFocus
              type="text"
              value={track.title}
              onChange={(e) => onUpdate(track.id, "title", e.target.value)}
              placeholder="Title"
              className="bg-transparent border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-white/25 focus:outline-none"
            />
            <input
              type="text"
              value={track.duration ?? ""}
              onChange={(e) => onUpdate(track.id, "duration", e.target.value)}
              placeholder="Duration"
              className="bg-transparent border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-white/25 focus:outline-none font-mono"
            />
          </div>
          <input
            type="url"
            value={track.audioUrl ?? ""}
            onChange={(e) => onUpdate(track.id, "audioUrl", e.target.value)}
            placeholder="Audio URL (optional)"
            className="w-full bg-transparent border border-white/10 px-3 py-2 text-xs text-white placeholder-white/20 focus:border-white/25 focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-[10px] tracking-[0.15em] uppercase text-white/40 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4 px-4 py-3">
          {/* Track number */}
          <span className="text-[11px] font-mono text-white/20 w-5 flex-shrink-0 text-center">
            {String(index + 1).padStart(2, "0")}
          </span>

          {/* Title */}
          <span className="flex-1 text-sm text-white/70 truncate">{track.title}</span>

          {/* Duration */}
          {track.duration && (
            <span className="text-[11px] font-mono text-white/25">{track.duration}</span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="text-white/20 hover:text-white disabled:opacity-0 transition-colors text-xs"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              className="text-white/20 hover:text-white disabled:opacity-0 transition-colors text-xs"
              title="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[10px] tracking-[0.1em] uppercase text-white/25 hover:text-white transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onRemove(track.id)}
              className="text-[10px] tracking-[0.1em] uppercase text-red-900 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
