import Link from "next/link"
import { createArtist } from "@/app/actions/artists"

export const metadata = { title: "New Artist — SUMG Admin" }

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default function NewArtistPage() {
  return (
    <main className="px-6 py-10 md:px-10 max-w-xl">
      <div className="mb-10">
        <Link
          href="/admin/artists"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← Artist Management
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">New Artist</h1>
        <p className="mt-1 text-sm text-white/50">
          Create the artist record. You can upload photos and add social links after saving.
        </p>
      </div>

      <form action={createArtist} className="space-y-6">

        <div>
          <label htmlFor="a-name" className={labelClass}>Name <span className="text-red-400">*</span></label>
          <input
            id="a-name"
            name="name"
            type="text"
            required
            placeholder="Artist display name"
            className={inputClass}
            autoFocus
          />
          <p className="mt-1 text-[10px] text-white/25">The slug is auto-generated from the name.</p>
        </div>

        <div>
          <label htmlFor="a-role" className={labelClass}>Role</label>
          <input
            id="a-role"
            name="role"
            type="text"
            placeholder="e.g. Lead Artist, Featured Artist"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="a-genre" className={labelClass}>Genre</label>
          <input
            id="a-genre"
            name="genre"
            type="text"
            placeholder="e.g. Hip-Hop / R&B"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="a-bio" className={labelClass}>Bio</label>
          <textarea
            id="a-bio"
            name="bio"
            rows={5}
            placeholder="Short artist biography for the public site…"
            className={`${inputClass} resize-y`}
          />
        </div>

        <div>
          <label htmlFor="a-tags" className={labelClass}>Tags</label>
          <input
            id="a-tags"
            name="tags"
            type="text"
            placeholder="e.g. hip-hop, cinematic, lyricism"
            className={inputClass}
          />
          <p className="mt-1 text-[10px] text-white/25">Comma-separated.</p>
        </div>

        {/* Status + Featured */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="a-status" className={labelClass}>Status</label>
            <select id="a-status" name="status" className={inputClass}>
              <option value="active"   className="bg-neutral-900">Active</option>
              <option value="draft"    className="bg-neutral-900">Draft</option>
              <option value="archived" className="bg-neutral-900">Archived</option>
            </select>
          </div>
          <div className="flex flex-col justify-end pb-0.5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="featured"
                className="w-4 h-4 rounded border border-white/20 bg-white/5 accent-white"
              />
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">Featured</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Create Artist →
          </button>
          <Link
            href="/admin/artists"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
