export const dynamic = "force-dynamic"
export const metadata = { title: "Songs — SUMG Admin" }

import Link from "next/link"
import { getAllSongs } from "@/lib/db/songs"
import { getArtists } from "@/lib/db/artists"
import { createSong, archiveSong, restoreSong, deleteSong } from "@/app/actions/songs"

const STATUS_CLS: Record<string, string> = {
  published: "bg-emerald-500/15 text-emerald-400",
  draft:     "bg-white/8 text-white/30",
  archived:  "bg-red-500/10 text-red-400/60",
  scheduled: "bg-amber-500/15 text-amber-400",
}

const inputCls =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
const labelCls = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default async function SongsAdminPage() {
  const [songs, artists] = await Promise.all([getAllSongs(), getArtists()])

  const published = songs.filter((s) => s.status === "published").length
  const draft     = songs.filter((s) => s.status === "draft").length
  const archived  = songs.filter((s) => s.status === "archived").length
  const withISRC  = songs.filter((s) => s.isrc).length

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
          <h1 className="text-3xl font-semibold">Songs</h1>
          <p className="mt-2 text-sm text-white/50">All tracks in the catalog. Songs can belong to a release or be standalone.</p>
        </div>
        <Link
          href="/admin/lyrics"
          className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-xs text-white/50 hover:text-white hover:border-white/30 transition"
        >
          Lyrics projects →
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        {[
          { label: "Total Songs",  value: songs.length },
          { label: "Published",    value: published },
          { label: "Draft",        value: draft },
          { label: "With ISRC",    value: `${withISRC}/${songs.length}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Song list */}
        <div>
          {songs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
              No songs yet. Add the first one →
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-sm font-medium">All Songs</h2>
                <span className="text-xs text-white/35">{songs.length} records · {archived} archived</span>
              </div>
              <div className="divide-y divide-white/5">
                {songs.map((song) => {
                  const archiveAction = archiveSong.bind(null, song.id)
                  const restoreAction = restoreSong.bind(null, song.id)
                  const deleteAction  = deleteSong.bind(null, song.id)
                  const isArchived    = song.status === "archived"

                  return (
                    <div
                      key={song.id}
                      className={`px-6 py-4 flex items-start gap-4 flex-wrap ${isArchived ? "opacity-50" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{song.title}</span>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${STATUS_CLS[song.status] ?? STATUS_CLS.draft}`}>
                            {song.status}
                          </span>
                          {song.isExplicit && (
                            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded border border-white/15 text-white/30">E</span>
                          )}
                        </div>
                        <div className="text-xs text-white/40 mt-1 flex flex-wrap gap-2">
                          <span>{song.artistName}</span>
                          {song.releaseName && <span>· {song.releaseName}</span>}
                          {song.genre && <span>· {song.genre}</span>}
                          {song.duration && <span>· {song.duration}</span>}
                          {song.isrc && <span className="font-mono text-white/25">· {song.isrc}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/admin/songs/${song.id}/edit`}
                          className="text-xs text-white/30 hover:text-white transition px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
                        >
                          Edit
                        </Link>
                        {isArchived ? (
                          <>
                            <form action={restoreAction}>
                              <button type="submit" className="text-xs text-emerald-400/50 hover:text-emerald-400 transition">
                                Restore
                              </button>
                            </form>
                            <form action={deleteAction}>
                              <button type="submit" className="text-xs text-red-400/40 hover:text-red-400 transition">
                                Delete
                              </button>
                            </form>
                          </>
                        ) : (
                          <form action={archiveAction}>
                            <button type="submit" className="text-xs text-white/20 hover:text-red-400/60 transition">
                              Archive
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Add song form */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 self-start">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">Add Song</h2>
          <form action={createSong} className="space-y-4">
            <div>
              <label htmlFor="s-title" className={labelCls}>Title *</label>
              <input id="s-title" name="title" type="text" required placeholder="Song title" className={inputCls} />
            </div>

            <div>
              <label htmlFor="s-artist" className={labelCls}>Artist *</label>
              <select id="s-artist" name="artist_slug" required className={inputCls}
                onChange={undefined}
              >
                <option value="">— select artist —</option>
                {artists.map((a) => (
                  <option key={a.slug} value={a.slug} data-name={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
              {/* artist_name is derived server-side from the slug — hidden field populated via JS or set manually */}
              <input type="hidden" name="artist_name" id="s-artist-name" value="" />
            </div>

            <div>
              <label htmlFor="s-genre" className={labelCls}>Genre</label>
              <input id="s-genre" name="genre" type="text" placeholder="e.g. Hip-Hop" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="s-duration" className={labelCls}>Duration</label>
                <input id="s-duration" name="duration" type="text" placeholder="3:24" className={inputCls} />
              </div>
              <div>
                <label htmlFor="s-track-no" className={labelCls}>Track #</label>
                <input id="s-track-no" name="track_number" type="number" min="1" placeholder="1" className={inputCls} />
              </div>
            </div>

            <div>
              <label htmlFor="s-isrc" className={labelCls}>ISRC</label>
              <input id="s-isrc" name="isrc" type="text" placeholder="USX0X0000000" className={inputCls} />
            </div>

            <div>
              <label htmlFor="s-status" className={labelCls}>Status</label>
              <select id="s-status" name="status" defaultValue="draft" className={inputCls}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input id="s-explicit" name="is_explicit" type="checkbox" value="true" className="w-4 h-4 rounded" />
              <label htmlFor="s-explicit" className="text-sm text-white/50">Explicit content</label>
            </div>

            <ArtistNameSync />

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition"
            >
              Add Song
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

// Client component to keep artist_name in sync with the select
function ArtistNameSync() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function(){
            var sel = document.getElementById('s-artist');
            var inp = document.getElementById('s-artist-name');
            if(!sel||!inp) return;
            function sync(){
              var opt = sel.options[sel.selectedIndex];
              inp.value = opt ? (opt.dataset.name || opt.text) : '';
            }
            sel.addEventListener('change', sync);
            sync();
          })();
        `,
      }}
    />
  )
}
