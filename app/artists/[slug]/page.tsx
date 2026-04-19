import { notFound } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ReleaseCard } from "@/components/cards/ReleaseCard";
import { artists } from "@/data/artists";
import { getPublishedReleases, getSongsForArtist } from "@/lib/cms";
import Link from "next/link";

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return artists.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const artist = artists.find((a) => a.slug === slug);
  return { title: artist ? `${artist.name} — SUMG Records` : "Artist Not Found" };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const artist = artists.find((a) => a.slug === slug);
  if (!artist) notFound();

  const releases = getPublishedReleases().filter((r) => r.artistSlug === artist.slug);
  const songs = getSongsForArtist(artist.slug);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — with optional hero image */}
        <section className="relative min-h-[60vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          {/* Background: hero image or giant letter */}
          {artist.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.heroImageUrl}
              alt={artist.name}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
              <span className="text-[30vw] font-black text-white/[0.025] tracking-tighter leading-none">
                {artist.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-40">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">{artist.genre}</p>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none mb-6">
              {artist.name}
            </h1>
            <p className="text-base text-white/40 max-w-xl leading-relaxed">{artist.bio}</p>
          </div>
        </section>

        {/* Long bio */}
        {artist.longBio && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="max-w-2xl">
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">About</p>
                <p className="text-base text-white/50 leading-loose">{artist.longBio}</p>
              </div>
            </div>
          </section>
        )}

        {/* Songs — first-class linked songs from songs table */}
        {songs.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="flex items-center justify-between mb-8">
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
                  Songs
                </p>
                <Link
                  href="/songs"
                  className="text-[10px] tracking-[0.2em] uppercase text-white/20 hover:text-white transition-colors"
                >
                  All Songs →
                </Link>
              </div>
              <div className="space-y-0 max-w-2xl">
                {songs.map((song, i) => (
                  <Link
                    key={song.id}
                    href={`/songs/${song.slug}`}
                    className="flex items-center gap-5 py-4 border-b border-white/[0.04] group hover:bg-white/[0.02] px-2 transition-colors"
                  >
                    <span className="text-[11px] font-mono text-white/20 min-w-[2rem]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                        {song.title}
                        {song.isExplicit && (
                          <span className="ml-2 text-[9px] border border-white/15 text-white/20 px-1.5 py-0.5">E</span>
                        )}
                      </span>
                      {song.releaseName && (
                        <p className="text-[10px] text-white/20 mt-0.5">{song.releaseName}</p>
                      )}
                    </div>
                    {song.duration && (
                      <span className="text-[11px] font-mono text-white/20">{song.duration}</span>
                    )}
                    <span className="text-white/10 group-hover:text-white/40 transition-colors text-xs">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Releases */}
        {releases.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">Discography</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {releases.map((r) => (
                  <a key={r.id} href={`/releases/${r.slug}`}>
                    <ReleaseCard release={r} />
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
