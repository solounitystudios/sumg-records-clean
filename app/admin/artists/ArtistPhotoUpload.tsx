"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadArtistPhoto } from "@/app/actions/artists"

export default function ArtistPhotoUpload({
  artistSlug,
  artistInitial,
  currentImageUrl,
}: {
  artistSlug: string
  artistInitial: string
  currentImageUrl?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const formData = new FormData()
    formData.set("file", file)

    startTransition(async () => {
      const result = await uploadArtistPhoto(formData, artistSlug)
      if ("error" in result) {
        setError(result.error)
      } else {
        router.refresh()
      }
      // Reset input so the same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = ""
    })
  }

  return (
    <div className="relative group shrink-0">
      {currentImageUrl ? (
        <img
          src={currentImageUrl}
          alt=""
          className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover"
        />
      ) : (
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-2xl md:text-3xl font-semibold text-white/60">
          {artistInitial}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        title="Upload photo"
        className="absolute inset-0 rounded-2xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white disabled:cursor-wait"
      >
        <span className="text-lg leading-none">{isPending ? "…" : "↑"}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />

      {error && (
        <div className="absolute top-[88px] left-0 z-10 w-52 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
