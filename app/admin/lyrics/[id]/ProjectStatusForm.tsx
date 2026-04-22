"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateLyricProjectStatus } from "@/app/actions/lyrics"
import type { LyricProjectStatus } from "@/lib/types/lyrics"

export default function ProjectStatusForm({
  projectId,
  currentStatus,
  totalSplit,
}: {
  projectId: string
  currentStatus: LyricProjectStatus
  totalSplit: number
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateLyricProjectStatus(projectId, formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
      <select
        name="status"
        defaultValue={currentStatus}
        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
      >
        <option value="open">Open</option>
        <option value="in_review">In Review</option>
        <option value="approved">Approved</option>
        <option value="archived">Archived</option>
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white transition disabled:opacity-50 disabled:cursor-wait"
      >
        {isPending ? "Saving…" : "Update Status"}
      </button>

      {error && (
        <p className="w-full text-xs text-red-400">{error}</p>
      )}

      {totalSplit < 99.99 && (
        <p className="w-full text-xs text-white/25">
          Setting to Approved requires splits totaling 100% (currently {totalSplit.toFixed(1)}%).
        </p>
      )}
    </form>
  )
}
