import Link from "next/link"
import { getArtists } from "@/lib/db/artists"
import { getReleases } from "@/lib/db/releases"
import { createLyricProject } from "@/app/actions/lyrics"

export const metadata = { title: "New Lyric Project — SUMG Admin" }

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default async function NewLyricProjectPage() {
  const [artists, releases] = await Promise.all([getArtists(), getReleases()])
  const activeReleases = releases.filter((r) => r.status === "live" || r.status === "scheduled")

  return (
    <main className="px-6 py-10 md:px-10 max-w-xl">
      <div className="mb-10">
        <Link
          href="/admin/lyrics"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← Lyric Engine
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">New Lyric Project</h1>
        <p className="mt-1 text-sm text-white/50">Start a new lyric writing project.</p>
      </div>

      <form action={createLyricProject} className="space-y-6">
        <div>
          <label htmlFor="title" className={labelClass}>Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Late Night Sessions"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="artistSlug" className={labelClass}>Artist (optional)</label>
          <select id="artistSlug" name="artistSlug" className={inputClass}>
            <option value="">No artist</option>
            {artists.map((a) => (
              <option key={a.slug} value={a.slug}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="releaseSlug" className={labelClass}>Release (optional)</label>
          <select id="releaseSlug" name="releaseSlug" className={inputClass}>
            <option value="">No release</option>
            {activeReleases.map((r) => (
              <option key={r.slug} value={r.slug}>{r.title} — {r.artistName}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>Initial Status</label>
          <select id="status" name="status" defaultValue="open" className={inputClass}>
            <option value="open">Open</option>
            <option value="in_review">In Review</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Create Project
          </button>
          <Link
            href="/admin/lyrics"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
