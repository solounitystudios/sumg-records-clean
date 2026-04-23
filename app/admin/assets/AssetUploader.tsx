"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadAssetFile } from "@/app/actions/assets"

const ACCEPTED = "image/jpeg,image/jpg,image/png,image/webp,image/avif,audio/mpeg,audio/wav,audio/flac,audio/aac,application/pdf,text/plain"

export function AssetUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setSuccess(null)

    Array.from(files).forEach(file => {
      const fd = new FormData()
      fd.set("file", file)
      startTransition(async () => {
        const result = await uploadAssetFile(fd)
        if ("error" in result) {
          setError(result.error)
        } else {
          setSuccess(`Uploaded ${file.name}`)
          router.refresh()
        }
      })
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-white/10 rounded-2xl px-8 py-10 flex flex-col items-center gap-3 cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-colors"
      >
        <div className="text-2xl text-white/20">{isPending ? "⏳" : "↑"}</div>
        <p className="text-sm text-white/40">
          {isPending ? "Uploading…" : "Drop files or click to upload"}
        </p>
        <p className="text-[10px] text-white/20">Images, audio, PDFs — up to 100 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {error && (
        <p className="mt-3 text-xs text-red-400 border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 rounded-xl px-4 py-2">
          {success}
        </p>
      )}
    </div>
  )
}
