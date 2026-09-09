import Link from "next/link"
import { getArtists } from "@/lib/db/artists"
import { createRelease } from "@/app/actions/releases"

export const dynamic = "force-dynamic"
export const metadata = { title: "New Release — SUMG Admin" }

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default async function NewReleasePage() {
  const artists = await getArtists()

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
        <h1 className="text-3xl font-semibold">New Release</h1>
        <p className="mt-1 text-sm text-white/50">Add a release to the SUMG catalog.</p>
      </div>

      <form action={createRelease} className="space-y-6">
        <div>
          <label htmlFor="title" className={labelClass}>Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Nocturnal Index"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="slug" className={labelClass}>Slug</label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            placeholder="e.g. nocturnal-index"
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-white/30">Lowercase, hyphens only. Must be unique.</p>
        </div>

        <div>
          <label htmlFor="artistSlug" className={labelClass}>Artist</label>
          <select id="artistSlug" name="artistSlug" required className={inputClass}>
            <option value="">Select artist…</option>
            {artists.map((a) => (
              <option key={a.slug} value={a.slug}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className={labelClass}>Type</label>
          <select id="type" name="type" defaultValue="single" className={inputClass}>
            <option value="single">Single</option>
            <option value="EP">EP</option>
            <option value="album">Album</option>
          </select>
        </div>

        <div>
          <label htmlFor="releaseDate" className={labelClass}>Release Date</label>
          <input
            id="releaseDate"
            name="releaseDate"
            type="date"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>Status</label>
          <select id="status" name="status" defaultValue="draft" className={inputClass}>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Accent Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              name="accentColor"
              defaultValue="#6366f1"
              className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
            />
            <span className="text-xs text-white/35">Used for card gradients and accents</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Create Release
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
