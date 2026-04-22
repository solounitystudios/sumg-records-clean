"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createLyricDraft } from "@/app/actions/lyrics"

export default function AddDraftForm({
  projectId,
  contributors,
}: {
  projectId: string
  contributors: { id: string; name: string }[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createLyricDraft(projectId, formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        formRef.current?.reset()
        router.refresh()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 mt-4">
      <textarea
        name="content"
        required
        rows={8}
        placeholder="Write lyrics here…"
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition resize-y font-mono leading-7"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-[0.15em] text-white/35 mb-1.5">
            Contributor (optional)
          </label>
          <select
            name="contributorId"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
          >
            <option value="">Unattributed</option>
            {contributors.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.15em] text-white/35 mb-1.5">
            Notes (optional)
          </label>
          <input
            name="notes"
            type="text"
            placeholder="e.g. First rough pass"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-wait"
      >
        {isPending ? "Saving…" : "Save Draft"}
      </button>
    </form>
  )
}
