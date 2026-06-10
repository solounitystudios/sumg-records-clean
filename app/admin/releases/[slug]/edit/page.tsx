import { notFound } from "next/navigation"
import Link from "next/link"
import { getReleaseBySlug } from "@/lib/db/releases"
import { updateRelease, archiveRelease, restoreRelease, deleteRelease } from "@/app/actions/releases"
import CoverArtField from "./CoverArtField"

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

  const action        = updateRelease.bind(null, slug)
  const archiveAction = archiveRelease.bind(null, slug)
  const restoreAction = restoreRelease.bind(null, slug)
  const deleteAction  = deleteRelease.bind(null, slug)
  const isArchived    = release.status === "archived"

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
        <CoverArtField initialUrl={release.coverArtUrl ?? null} releaseTitle={release.title} />

        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={release.status} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
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

        <div>
          <label className={labelClass}>Spotify URL</label>
          <input
            type="url"
            name="spotifyUrl"
            defaultValue={release.spotifyUrl ?? ""}
            placeholder="https://open.spotify.com/album/…"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-white/25">
            Paste the Spotify album or single URL. Powers the On Spotify panel on the release page.
          </p>
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

      {/* Danger Zone — owner, co_owner, admin only */}
      <div className="mt-10 rounded-2xl border border-white/[0.07] bg-[#0d1016] px-5 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/25 mb-4">Danger Zone</p>
        <div className="space-y-4">
          {isArchived ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/60">This release is archived and hidden from the public site.</p>
                <p className="text-xs text-white/30 mt-0.5">Restoring sets status back to draft for review.</p>
              </div>
              <form action={restoreAction}>
                <button type="submit" className="shrink-0 rounded-full border border-emerald-500/30 px-4 py-2 text-xs font-medium text-emerald-400 hover:border-emerald-500/60 hover:text-emerald-300 transition">
                  Restore Release
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/60">Archive this release to hide it from the public site.</p>
                <p className="text-xs text-white/30 mt-0.5">Can be restored at any time.</p>
              </div>
              <form action={archiveAction}>
                <button type="submit" className="shrink-0 rounded-full border border-red-500/20 px-4 py-2 text-xs font-medium text-red-400/70 hover:border-red-500/40 hover:text-red-400 transition">
                  Archive Release
                </button>
              </form>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/[0.05]">
            <div>
              <p className="text-sm text-white/60">Permanently delete this release.</p>
              <p className="text-xs text-red-400/50 mt-0.5">This cannot be undone. All associated data will be lost.</p>
            </div>
            <form action={deleteAction}>
              <button type="submit" className="shrink-0 rounded-full border border-red-500/30 px-4 py-2 text-xs font-medium text-red-400 hover:border-red-500/60 hover:bg-red-500/10 transition">
                Delete Permanently
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
