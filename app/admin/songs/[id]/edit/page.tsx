export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import Link from "next/link"
import { getSongById } from "@/lib/db/songs"
import { updateSong } from "@/app/actions/songs"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const song = await getSongById(id)
  return { title: song ? `Edit "${song.title}" — SUMG Admin` : "Song Not Found" }
}

const inputCls =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
const labelCls = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const song = await getSongById(id)
  if (!song) notFound()

  const action = updateSong.bind(null, song.id)

  return (
    <main className="px-6 py-10 md:px-10 max-w-2xl">
      <div className="mb-8">
        <Link href="/admin/songs" className="text-xs text-white/30 hover:text-white/60 transition mb-4 inline-block">
          ← Songs
        </Link>
        <h1 className="text-2xl font-semibold">{song.title}</h1>
        <p className="text-sm text-white/40 mt-1">{song.artistName}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6">
        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="e-title" className={labelCls}>Title</label>
            <input id="e-title" name="title" type="text" required defaultValue={song.title} className={inputCls} />
          </div>

          <div>
            <label htmlFor="e-genre" className={labelCls}>Genre</label>
            <input id="e-genre" name="genre" type="text" defaultValue={song.genre ?? ""} placeholder="e.g. Hip-Hop" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="e-duration" className={labelCls}>Duration</label>
              <input id="e-duration" name="duration" type="text" defaultValue={song.duration ?? ""} placeholder="3:24" className={inputCls} />
            </div>
            <div>
              <label htmlFor="e-track-no" className={labelCls}>Track #</label>
              <input id="e-track-no" name="track_number" type="number" min="1"
                defaultValue={song.trackNumber ?? ""} className={inputCls} />
            </div>
          </div>

          <div>
            <label htmlFor="e-isrc" className={labelCls}>ISRC</label>
            <input id="e-isrc" name="isrc" type="text" defaultValue={song.isrc ?? ""} placeholder="USX0X0000000" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="e-status" className={labelCls}>Status</label>
              <select id="e-status" name="status" defaultValue={song.status} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label htmlFor="e-visible" className={labelCls}>Visibility</label>
              <select id="e-visible" name="is_visible" defaultValue={song.isVisible ? "true" : "false"} className={inputCls}>
                <option value="false">Hidden</option>
                <option value="true">Visible</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="e-explicit"
              name="is_explicit"
              type="checkbox"
              value="true"
              defaultChecked={song.isExplicit}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="e-explicit" className="text-sm text-white/50">Explicit content</label>
          </div>

          <div>
            <label htmlFor="e-lyrics" className={labelCls}>Lyrics</label>
            <textarea
              id="e-lyrics"
              name="lyrics"
              rows={8}
              defaultValue={song.lyrics ?? ""}
              placeholder="Song lyrics…"
              className={`${inputCls} resize-y`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition"
            >
              Save Changes
            </button>
            <Link
              href="/admin/songs"
              className="rounded-full border border-white/15 px-6 py-3 text-sm text-white/50 hover:text-white hover:border-white/30 transition text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Read-only metadata */}
      <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-3">Metadata</p>
        <Row label="ID"       value={song.id} mono />
        <Row label="Slug"     value={song.slug} mono />
        <Row label="Artist"   value={`${song.artistName} (${song.artistSlug})`} />
        {song.releaseSlug && <Row label="Release" value={song.releaseSlug} />}
        {song.spotifyTrackId && <Row label="Spotify" value={song.spotifyTrackId} mono />}
        <Row label="Created"  value={new Date(song.createdAt).toLocaleDateString()} />
        <Row label="Updated"  value={new Date(song.updatedAt).toLocaleDateString()} />
      </div>
    </main>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-[10px] uppercase tracking-wide text-white/25 w-16 shrink-0">{label}</span>
      <span className={`text-xs text-white/50 break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  )
}
