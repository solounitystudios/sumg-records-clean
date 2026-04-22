import { notFound } from "next/navigation"
import Link from "next/link"
import { getReleaseBySlug } from "@/lib/db/releases"
import { updateRelease } from "@/app/actions/releases"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const release = await getReleaseBySlug(slug)
  if (!release) return { title: "Not Found — SUMG Admin" }
  return { title: `Edit ${release.title} — SUMG Admin` }
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default async function EditReleasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const release = await getReleaseBySlug(slug)
  if (!release) notFound()

  const action = updateRelease.bind(null, slug)

  return (
    <main className="px-6 py-10 md:px-10 max-w-xl">
      <div className="mb-10">
        <Link
          href="/admin/releases"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← Release Command Center
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Edit Release</h1>
        <p className="mt-1 text-sm text-white/50">{release.title} · {release.artistName}</p>
      </div>

      <form action={action} className="space-y-6">
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={release.status} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Release Date</label>
          <input
            type="date"
            name="releaseDate"
            defaultValue={release.releaseDate}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Accent Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              name="accentColor"
              defaultValue={release.accentColor || "#6366f1"}
              className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
            />
            <span className="text-xs text-white/35">Used for card gradients and accents</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/40">Title</span>
            <span className="text-white/70">{release.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Artist</span>
            <span className="text-white/70">{release.artistName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Type</span>
            <span className="text-white/70">{release.type.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Slug</span>
            <span className="text-white/40 font-mono text-xs">{release.slug}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Save Changes
          </button>
          <Link
            href="/admin/releases"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
