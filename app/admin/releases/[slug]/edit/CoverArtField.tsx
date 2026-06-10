"use client"

import { useRef, useState, useTransition } from "react"
import { uploadAssetFile } from "@/app/actions/assets"

export default function CoverArtField({
  initialUrl,
  releaseTitle,
}: {
  initialUrl: string | null
  releaseTitle: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string>(initialUrl ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const fd = new FormData()
    fd.set("file", file)
    fd.set("folder", "release-covers")
    startTransition(async () => {
      const r = await uploadAssetFile(fd)
      if ("error" in r) setError(r.error)
      else setUrl(r.url)
      if (fileRef.current) fileRef.current.value = ""
    })
  }

  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Cover Art</label>
      <input type="hidden" name="coverArtUrl" value={url} />
      <div className="flex items-center gap-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="w-24 h-24 rounded-xl object-cover border border-white/10"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-3xl font-semibold text-white/40">
            {releaseTitle.charAt(0)}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/70 hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            {isPending ? "Uploading…" : url ? "Replace" : "Upload Image"}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-left text-xs text-white/35 hover:text-white/60"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="…or paste a public URL"
        className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
