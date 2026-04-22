"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addLyricContribution } from "@/app/actions/lyrics"

export default function AddContributorForm({
  projectId,
  availableContributors,
}: {
  projectId: string
  availableContributors: { id: string; name: string; type: string }[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (availableContributors.length === 0) {
    return (
      <p className="text-xs text-white/30 mt-3">All contributors are already assigned to this project.</p>
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await addLyricContribution(projectId, formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        formRef.current?.reset()
        router.refresh()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-4 rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
      <p className="text-xs uppercase tracking-[0.15em] text-white/35">Add Contributor</p>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-white/30 mb-1">Contributor</label>
          <select
            name="contributorId"
            required
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
          >
            <option value="">Select…</option>
            {availableContributors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.type === "ai_persona" ? " (AI)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/30 mb-1">Role</label>
          <select
            name="role"
            defaultValue="writer"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
          >
            <option value="writer">Writer</option>
            <option value="co-writer">Co-Writer</option>
            <option value="editor">Editor</option>
            <option value="ai_assist">AI Assist</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/30 mb-1">Split %</label>
          <input
            name="splitPercentage"
            type="number"
            min="0"
            max="100"
            step="0.1"
            defaultValue="0"
            required
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white transition disabled:opacity-50 disabled:cursor-wait"
      >
        {isPending ? "Adding…" : "Add Contributor"}
      </button>
    </form>
  )
}
