import Link from "next/link"
import { getArtists } from "@/lib/db/artists"
import { formatStreams } from "@/lib/data"

export const metadata = { title: "Artists — SUMG Records" }

export default async function ArtistsPage() {
  const artists = await getArtists()
  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40 mb-3">Roster</p>
          <h1 className="text-4xl font-semibold md:text-6xl">The SUMG artists</h1>
          <p className="mt-5 max-w-2xl text-base text-white/60 leading-7">
            Seven distinct voices. One connected ecosystem. Each artist in the SUMG universe
            brings a singular worldview — the label exists to amplify it.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {artists.map((artist, index) => (
            <Link
              key={artist.slug}
              href={`/artists/${artist.slug}`}
              className="group block overflow-hidden rounded-3xl border border-white/10 bg-[#0d1016] transition hover:border-white/20 hover:bg-[#11151d]"
            >
              <div className="flex aspect-[16/9] items-end justify-start bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08))] p-6">
                <div>
                  <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/35">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-2xl font-semibold leading-tight group-hover:text-white/90 transition">
                    {artist.name}
                  </h3>
                  <p className="mt-1 text-sm text-white/55">{artist.role}</p>
                </div>
              </div>
              <div className="px-6 py-5 border-t border-white/8">
                <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-3">{artist.genre}</p>
                <p className="text-sm text-white/55 leading-6 line-clamp-2">{artist.bio}</p>
                <div className="mt-4 flex gap-6">
                  <div>
                    <div className="text-sm font-medium">{formatStreams(artist.monthlyListeners)}</div>
                    <div className="text-xs text-white/35 uppercase tracking-[0.15em] mt-0.5">Monthly</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{formatStreams(artist.totalStreams)}</div>
                    <div className="text-xs text-white/35 uppercase tracking-[0.15em] mt-0.5">Total</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{artist.releaseCount}</div>
                    <div className="text-xs text-white/35 uppercase tracking-[0.15em] mt-0.5">Releases</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
