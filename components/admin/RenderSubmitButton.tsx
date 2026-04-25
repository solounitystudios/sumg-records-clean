"use client"

import { useFormStatus } from "react-dom"

export function RenderSubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <div className="space-y-1">
      <button
        type="submit"
        disabled={pending || disabled}
        className="w-full rounded-xl border border-orange-500/25 bg-orange-500/5 px-4 py-2.5 text-[11px] font-medium text-orange-400/80 hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {pending ? "Rendering…" : "Render MP4 →"}
      </button>
      {pending && (
        <p className="text-[10px] text-white/25 text-center">
          This may take 30–120s depending on audio length.
        </p>
      )}
    </div>
  )
}
