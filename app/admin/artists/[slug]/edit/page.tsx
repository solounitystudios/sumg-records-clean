import { notFound } from "next/navigation"
import Link from "next/link"
import { getArtistBySlug } from "@/lib/db/artists"
import { updateArtist } from "@/app/actions/artists"
import { SpotifyLinkPanel } from "@/components/admin/SpotifyLinkPanel"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) return { title: "Not Found — SUMG Admin" }
  return { title: `Edit ${artist.name} — SUMG Admin` }
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default async function EditArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  const action = updateArtist.bind(null, slug)

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
        <h1 className="text-3xl font-semibold">Edit Artist</h1>
        <p className="mt-1 text-sm text-white/50">{artist.name}</p>
      </div>

      <form action={action} className="space-y-6">
        <div>
          <label htmlFor="a-name" className={labelClass}>Name</label>
          <input
            id="a-name"
            name="name"
            type="text"
            required
            defaultValue={artist.name}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="a-role" className={labelClass}>Role</label>
          <input
            id="a-role"
            name="role"
            type="text"
            placeholder="e.g. Lead Artist"
            defaultValue={artist.role}
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
            defaultValue={artist.genre}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="a-bio" className={labelClass}>Bio</label>
          <textarea
            id="a-bio"
            name="bio"
            rows={6}
            defaultValue={artist.bio}
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
            defaultValue={artist.tags.join(", ")}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-white/25">Comma-separated values.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="a-monthly" className={labelClass}>Monthly Listeners</label>
            <input
              id="a-monthly"
              name="monthlyListeners"
              type="number"
              min="0"
              defaultValue={artist.monthlyListeners}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="a-total" className={labelClass}>Total Streams</label>
            <input
              id="a-total"
              name="totalStreams"
              type="number"
              min="0"
              defaultValue={artist.totalStreams}
              className={inputClass}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-xs text-white/30">
          Slug <span className="font-mono text-white/50 ml-2">{artist.slug}</span> · cannot be changed here
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Save Changes
          </button>
          <Link
            href="/admin/artists"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Spotify linking — separate from the main form so it submits via API */}
      <div className="mt-10 space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/25">Streaming</p>
        <SpotifyLinkPanel
          artistSlug={artist.slug}
          initialSpotifyUrl={artist.socialLinks?.spotify}
        />
      </div>
    </main>
  )
}
