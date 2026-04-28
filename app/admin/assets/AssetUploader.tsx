"use client"

import { useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { uploadAssetFile } from "@/app/actions/assets"

// All accepted MIME types + extension hints for the file picker
const ACCEPT = [
  // Audio
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/flac", "audio/x-flac",
  "audio/aiff", "audio/x-aiff", "audio/m4a", "audio/x-m4a", "audio/mp4", "audio/aac", "audio/ogg",
  // Images
  "image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/tiff",
  "image/heic", "image/heif", "image/avif", "image/gif", "image/vnd.adobe.photoshop",
  // Video
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
  "video/x-msvideo", "video/x-m4v",
  // Documents
  "application/pdf", "text/plain", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Design
  "application/postscript", "application/illustrator",
  // Archive
  "application/zip", "application/x-zip-compressed",
  // Extension fallbacks (some OS/browsers send wrong MIME)
  ".mp3", ".wav", ".aiff", ".aif", ".flac", ".m4a", ".aac", ".ogg",
  ".jpg", ".jpeg", ".png", ".webp", ".svg", ".tiff", ".tif", ".heic", ".psd", ".ai",
  ".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v",
  ".pdf", ".docx", ".xlsx", ".csv", ".txt", ".pptx",
  ".eps", ".zip",
].join(",")

interface QueueItem {
  uid: string
  file: File
  previewUrl: string | null  // object URL for local preview
  status: "uploading" | "done" | "error"
  error?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ mime }: { mime: string }) {
  const major = mime.split("/")[0]
  if (major === "audio")  return <span className="text-violet-400/80 text-lg leading-none">♫</span>
  if (major === "video")  return <span className="text-sky-400/80 text-lg leading-none">▶</span>
  if (major === "image")  return <span className="text-white/40 text-lg leading-none">▣</span>
  if (mime.includes("pdf")) return <span className="text-red-400/60 text-lg leading-none">▤</span>
  if (mime.includes("zip") || mime.includes("archive")) return <span className="text-amber-400/60 text-lg leading-none">⊟</span>
  if (mime.includes("illustrator") || mime.includes("postscript") || mime.includes("photoshop")) {
    return <span className="text-blue-400/60 text-lg leading-none">✦</span>
  }
  return <span className="text-white/25 text-lg leading-none">▤</span>
}

function QueueItemRow({ item, onDismiss }: { item: QueueItem; onDismiss: () => void }) {
  const major = item.file.type.split("/")[0]
  const isImage = major === "image"
  const isAudio = major === "audio"

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
      item.status === "error"   ? "border-red-500/20 bg-red-500/5" :
      item.status === "done"    ? "border-emerald-500/15 bg-emerald-500/[0.03]" :
                                  "border-white/[0.07] bg-white/[0.02]"
    }`}>

      {/* Thumbnail / icon */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] flex items-center justify-center shrink-0">
        {isImage && item.previewUrl ? (
          <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <FileTypeIcon mime={item.file.type} />
        )}
      </div>

      {/* Name + size + audio preview */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/70 truncate font-medium" title={item.file.name}>
          {item.file.name}
        </p>
        <p className="text-[9px] text-white/30 mt-0.5">{formatBytes(item.file.size)}</p>
        {isAudio && item.previewUrl && item.status === "done" && (
          <audio
            src={item.previewUrl}
            controls
            className="mt-1.5 h-6 w-full max-w-[200px] opacity-60 hover:opacity-100 transition-opacity"
          />
        )}
      </div>

      {/* Status */}
      <div className="shrink-0 flex items-center gap-2">
        {item.status === "uploading" && (
          <span className="text-[9px] text-white/30 animate-pulse">uploading…</span>
        )}
        {item.status === "done" && (
          <span className="text-[9px] text-emerald-400/80">✓ done</span>
        )}
        {item.status === "error" && (
          <span className="text-[9px] text-red-400/80 max-w-[160px] truncate" title={item.error}>
            {item.error}
          </span>
        )}
        {(item.status === "done" || item.status === "error") && (
          <button
            onClick={onDismiss}
            className="text-[9px] text-white/15 hover:text-white/50 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export function AssetUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const [queue,      setQueue]      = useState<QueueItem[]>([])
  const [dragging,   setDragging]   = useState(false)

  function dismiss(uid: string) {
    setQueue((q) => {
      const item = q.find((i) => i.uid === uid)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return q.filter((i) => i.uid !== uid)
    })
  }

  function dismissAll() {
    setQueue((q) => {
      q.forEach((i) => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl) })
      return []
    })
  }

  const uploadFile = useCallback(async (item: QueueItem) => {
    const fd = new FormData()
    fd.set("file", item.file)
    const result = await uploadAssetFile(fd)

    if ("error" in result) {
      setQueue((q) => q.map((i) => i.uid === item.uid ? { ...i, status: "error", error: result.error } : i))
    } else {
      setQueue((q) => q.map((i) => i.uid === item.uid ? { ...i, status: "done" } : i))
      router.refresh()
    }
  }, [router])

  function enqueueFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const newItems: QueueItem[] = Array.from(files).map((file) => {
      const major = file.type.split("/")[0]
      // Build local preview URL for images and audio
      const previewUrl = (major === "image" || major === "audio")
        ? URL.createObjectURL(file)
        : null
      const item: QueueItem = {
        uid:        crypto.randomUUID(),
        file,
        previewUrl,
        status:     "uploading",
      }
      return item
    })

    setQueue((q) => [...q, ...newItems])
    newItems.forEach(uploadFile)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    enqueueFiles(e.dataTransfer.files)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear drag state if leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false)
    }
  }

  const doneCount    = queue.filter((i) => i.status === "done").length
  const errorCount   = queue.filter((i) => i.status === "error").length
  const pendingCount = queue.filter((i) => i.status === "uploading").length

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl px-8 py-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
          dragging
            ? "border-white/30 bg-white/[0.04]"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
        }`}
      >
        <div className={`text-2xl transition-colors ${dragging ? "text-white/60" : "text-white/20"}`}>
          {pendingCount > 0 ? "⏳" : dragging ? "↓" : "↑"}
        </div>
        <p className="text-sm text-white/40 pointer-events-none select-none">
          {pendingCount > 0
            ? `Uploading ${pendingCount} file${pendingCount !== 1 ? "s" : ""}…`
            : dragging
            ? "Drop to upload"
            : "Drop files or click to upload"}
        </p>
        <p className="text-[10px] text-white/20 pointer-events-none select-none">
          Audio · Images · Video · Documents · Design files · Zip packs
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => enqueueFiles(e.target.files)}
      />

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-white/25 uppercase tracking-wide">
              {pendingCount > 0 && `${pendingCount} uploading`}
              {doneCount > 0 && `${pendingCount > 0 ? " · " : ""}${doneCount} done`}
              {errorCount > 0 && ` · ${errorCount} failed`}
            </p>
            {pendingCount === 0 && (
              <button
                onClick={dismissAll}
                className="text-[9px] text-white/20 hover:text-white/50 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          {queue.map((item) => (
            <QueueItemRow key={item.uid} item={item} onDismiss={() => dismiss(item.uid)} />
          ))}
        </div>
      )}
    </div>
  )
}
