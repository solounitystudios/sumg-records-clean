"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { recordLyricApproval } from "@/app/actions/lyrics"
import type { LyricApproval } from "@/lib/types/lyrics"

const approvalStyle: Record<string, string> = {
  approved: "text-emerald-400",
  rejected: "text-red-400",
  revision_requested: "text-amber-400",
}

const approvalLabel: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision Requested",
}

export default function ApprovalActions({
  draftId,
  totalSplit,
  latestApproval,
}: {
  draftId: string
  totalSplit: number
  latestApproval?: LyricApproval
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function act(status: string) {
    setError(null)
    const formData = new FormData()
    formData.set("status", status)

    startTransition(async () => {
      const result = await recordLyricApproval(draftId, formData)
      if ("error" in result) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/8">
      {latestApproval && (
        <p className={`text-xs mb-2 ${approvalStyle[latestApproval.status] ?? "text-white/40"}`}>
          Last action: {approvalLabel[latestApproval.status] ?? latestApproval.status}
          {latestApproval.notes ? ` — ${latestApproval.notes}` : ""}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => act("approved")}
          disabled={isPending}
          className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50 disabled:cursor-wait"
        >
          Approve
        </button>
        <button
          onClick={() => act("revision_requested")}
          disabled={isPending}
          className="text-xs px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition disabled:opacity-50 disabled:cursor-wait"
        >
          Request Revision
        </button>
        <button
          onClick={() => act("rejected")}
          disabled={isPending}
          className="text-xs px-3 py-1.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-wait"
        >
          Reject
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {totalSplit < 99.99 && !error && (
        <p className="mt-1.5 text-xs text-white/25">
          Approval requires splits totaling 100% (currently {totalSplit.toFixed(1)}%).
        </p>
      )}
    </div>
  )
}
