"use client";
import { useState, useRef } from "react";
import { AssetType } from "@/lib/types";
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  ACCEPTED_AUDIO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_AUDIO_SIZE,
} from "@/lib/media";

interface MediaUploaderProps {
  type: AssetType;
  label?: string;
  currentUrl?: string;
  onUpload?: (file: File) => Promise<void>;
  disabled?: boolean;
}

function acceptForType(type: AssetType): string {
  if (type === "image") return ACCEPTED_IMAGE_TYPES.join(",");
  if (type === "video") return ACCEPTED_VIDEO_TYPES.join(",");
  if (type === "audio") return ACCEPTED_AUDIO_TYPES.join(",");
  return "*/*";
}

function maxSizeForType(type: AssetType): number {
  if (type === "image") return MAX_IMAGE_SIZE;
  if (type === "video") return MAX_VIDEO_SIZE;
  if (type === "audio") return MAX_AUDIO_SIZE;
  return MAX_IMAGE_SIZE;
}

export function MediaUploader({
  type,
  label,
  currentUrl,
  onUpload,
  disabled = false,
}: MediaUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSize = maxSizeForType(type);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > maxSize) {
      setError(`File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB.`);
      return;
    }
    setFileName(file.name);
    if (onUpload) {
      setUploading(true);
      try {
        await onUpload(file);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">{label}</p>
      )}

      {currentUrl && (
        <div className="mb-3 p-3 border border-white/10 bg-white/[0.02] text-xs text-white/40 truncate">
          Current: {currentUrl}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-none p-8 text-center cursor-pointer transition-all duration-200 ${
          disabled
            ? "opacity-40 cursor-not-allowed border-white/5"
            : dragging
            ? "border-white/40 bg-white/[0.04]"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptForType(type)}
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {uploading ? (
          <p className="text-[11px] tracking-[0.2em] uppercase text-white/40">Uploading...</p>
        ) : fileName ? (
          <p className="text-[11px] text-white/60 truncate max-w-xs mx-auto">{fileName}</p>
        ) : (
          <>
            <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 mb-1">
              {currentUrl ? "Replace" : "Upload"} {type}
            </p>
            <p className="text-[10px] text-white/15">
              Drop file here or click to browse
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-[10px] text-red-400 tracking-wide">{error}</p>
      )}
    </div>
  );
}
