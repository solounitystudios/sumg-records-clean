"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

interface Props {
  slug: string
  isArchived: boolean
  archiveAction: () => Promise<void>
  restoreAction: () => Promise<void>
  deleteAction:  () => Promise<void>
}

export default function ArtistActionMenu({
  slug,
  isArchived,
  archiveAction,
  restoreAction,
  deleteAction,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  const item = "flex items-center gap-2.5 w-full px-3 py-2 text-left text-[11px] font-mono text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors duration-100 rounded"
  const danger = "flex items-center gap-2.5 w-full px-3 py-2 text-left text-[11px] font-mono text-red-400/60 hover:bg-red-500/[0.08] hover:text-red-400 transition-colors duration-100 rounded"

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-mono text-white/30 hover:text-white transition-colors duration-150 border border-white/[0.08] hover:border-white/20 px-2.5 py-1 rounded leading-none"
        aria-label="Artist actions"
      >
        •••
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-white/[0.1] bg-[#0d1117] shadow-2xl shadow-black/50 p-1">
          <Link
            href={`/admin/artists/${slug}/edit`}
            onClick={() => setOpen(false)}
            className={item}
          >
            Edit
          </Link>

          {!isArchived && (
            <Link
              href={`/artists/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={item}
            >
              View Public ↗
            </Link>
          )}

          <Link
            href={`/admin/releases/new?artist=${slug}`}
            onClick={() => setOpen(false)}
            className={item}
          >
            New Release
          </Link>

          <Link
            href={`/admin/songs?artist=${slug}`}
            onClick={() => setOpen(false)}
            className={item}
          >
            New Song
          </Link>

          <Link
            href={`/admin/artists/${slug}/edit#profile`}
            onClick={() => setOpen(false)}
            className={item}
          >
            Upload / Change Photo
          </Link>

          <div className="my-1 border-t border-white/[0.06]" />

          {isArchived ? (
            <form action={restoreAction}>
              <button type="submit" onClick={() => setOpen(false)} className={item}>
                Restore
              </button>
            </form>
          ) : (
            <form action={archiveAction}>
              <button type="submit" onClick={() => setOpen(false)} className={item}>
                Archive
              </button>
            </form>
          )}

          <form
            action={deleteAction}
            onSubmit={(e) => {
              if (!confirm(`Permanently delete this artist? This cannot be undone.`)) {
                e.preventDefault()
              }
              setOpen(false)
            }}
          >
            <button type="submit" className={danger}>
              Delete
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
