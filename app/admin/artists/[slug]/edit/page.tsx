import { notFound } from "next/navigation"
import Link from "next/link"
import { getArtistBySlug } from "@/lib/db/artists"
import { updateArtist, archiveArtist, restoreArtist } from "@/app/actions/artists"
import { SpotifyLinkPanel } from "@/components/admin/SpotifyLinkPanel"
import HeroImageUpload from "./HeroImageUpload"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) return { title: "Not Found — SUMG Admin" }
  return { title: `Edit ${artist.name} — SUMG Admin` }
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

const SOCIAL_FIELDS: { name: string; label: string; placeholder: string }[] = [
  { name: "instagram",  label: "Instagram",  placeholder: "https://instagram.com/..." },
  { name: "tiktok",     label: "TikTok",     placeholder: "https://tiktok.com/@..." },
  { name: "twitter",    label: "Twitter / X", placeholder: "https://x.com/..." },
  { name: "youtube",    label: "YouTube",    placeholder: "https://youtube.com/@..." },
  { name: "soundcloud", label: "SoundCloud", placeholder: "https://soundcloud.com/..." },
]

export default async function EditArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = await getArtistBySlug(slug)
  if (!artist) notFound()

  const action        = updateArtist.bind(null, slug)
  const archiveAction = archiveArtist.bind(null, slug)
  const restoreAction = restoreArtist.bind(null, slug)
  const isArchived    = artist.status === "archived"

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

      {/* Hero image */}
      <div className="mb-8 rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Hero Image</p>
        </div>
        <div className="p-5">
          <HeroImageUpload
            artistSlug={artist.slug}
            currentHeroUrl={artist.heroImageUrl}
            currentProfileUrl={artist.profileImageUrl}
          />
        </div>
      </div>

      <form action={action} className="space-y-6">

        {/* Core fields */}
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
          <p className="mt-1 text-[10px] text-white/25">Comma-separated values.</p>
        </div>

        {/* Status + Featured */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="a-status" className={labelClass}>Status</label>
            <select id="a-status" name="status" defaultValue={artist.status ?? "active"} className={inputClass}>
              <option value="active"   className="bg-neutral-900">Active</option>
              <option value="draft"    className="bg-neutral-900">Draft</option>
              <option value="archived" className="bg-neutral-900">Archived</option>
            </select>
          </div>
          <div className="flex flex-col justify-end pb-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={artist.featured ?? false}
                className="w-4 h-4 rounded border border-white/20 bg-white/5 accent-white"
              />
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">Featured</span>
            </label>
          </div>
        </div>

        {/* Social links */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/25">Social Links</p>
          {SOCIAL_FIELDS.map(f => (
            <div key={f.name}>
              <label htmlFor={`a-${f.name}`} className={labelClass}>{f.label}</label>
              <input
                id={`a-${f.name}`}
                name={f.name}
                type="url"
                placeholder={f.placeholder}
                defaultValue={artist.socialLinks?.[f.name as keyof typeof artist.socialLinks] ?? ""}
                className={inputClass}
              />
            </div>
          ))}
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

      {/* Spotify linking */}
      <div className="mt-10 space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/25">Streaming</p>
        <SpotifyLinkPanel
          artistSlug={artist.slug}
          initialSpotifyUrl={artist.socialLinks?.spotify}
        />
      </div>

      {/* Archive / Restore — owner, co_owner, admin only */}
      <div className="mt-10 rounded-2xl border border-white/[0.07] bg-[#0d1016] px-5 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/25 mb-4">Danger Zone</p>
        {isArchived ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">This artist is archived and hidden from the public site.</p>
              <p className="text-xs text-white/30 mt-0.5">Restoring sets status back to active.</p>
            </div>
            <form action={restoreAction}>
              <button
                type="submit"
                className="shrink-0 rounded-full border border-emerald-500/30 px-4 py-2 text-xs font-medium text-emerald-400 hover:border-emerald-500/60 hover:text-emerald-300 transition"
              >
                Restore Artist
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">Archive this artist to hide them from the public site.</p>
              <p className="text-xs text-white/30 mt-0.5">They can be restored at any time. Requires owner / co_owner / admin.</p>
            </div>
            <form action={archiveAction}>
              <button
                type="submit"
                className="shrink-0 rounded-full border border-red-500/20 px-4 py-2 text-xs font-medium text-red-400/70 hover:border-red-500/40 hover:text-red-400 transition"
              >
                Archive Artist
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
