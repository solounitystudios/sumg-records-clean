"use client"

import { useFormStatus } from "react-dom"

interface Props {
  label?:        string
  pendingLabel?: string
  disabled?:     boolean
  className?:    string
}

export function RenderSubmitButton({
  label        = "Save",
  pendingLabel = "Saving…",
  disabled,
  className,
}: Props) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={
        className ??
        "w-full rounded-xl border border-orange-500/25 bg-orange-500/5 px-4 py-2.5 text-[11px] font-medium text-orange-400/80 hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
      }
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
