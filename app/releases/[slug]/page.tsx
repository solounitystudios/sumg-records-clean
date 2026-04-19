import { notFound } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getPublishedReleases, getReleaseBySlug, getSongsForRelease } from "@/lib/cms";
import Link from "next/link";

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getPublishedReleases().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const release = getReleaseBySlug(slug);
  return { title: release ? `${release.title} — SUMG Records` : "Release Not Found" };
}

export default async function ReleasePage({ params }: Props) {
  const { slug } = await params;
  const release = getReleaseBySlug(slug);
  if (!release) notFound();

  // First-class songs linked to this release (from the songs table)
  const linkedSongs = getSongsForRelease(slug);

  return (
    <>
      <Navbar />
      <main>
        <section className="relative min-h-[55vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
            <span className="text-[30vw] font-black text-white/[0.025] tracking-tighter leading-none">{release.title.charAt(0)}</span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-40">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-2">
              <Link href={`/artists/${release.artistSlug}`} className="hover:text-white/60 transition-colors">
                {release.artistName}
              </Link>
              {" "}· {release.type} · {release.genre}
            </p>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none mb-6">{release.title}</h1>
            <p className="text-base text-white/40 max-w-xl">{release.description}</p>
          </div>
        </section>

        {/* First-class linked songs (from songs table — auto-published with release) */}
        {linkedSongs.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">Tracklist</p>
              <div className="space-y-0 max-w-2xl">
                {linkedSongs.map((song, i) => (
                  <Link
                    key={song.id}
                    href={`/songs/${song.slug}`}
                    className="flex items-center gap-5 py-4 border-b border-white/5 group hover:bg-white/[0.02] px-2 transition-colors"
                  >
                    <span className="text-[11px] font-mono text-white/20 min-w-[2rem]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 text-sm text-white/70 group-hover:text-white transition-colors">
                      {song.title}
                      {song.isExplicit && (
                        <span className="ml-2 text-[9px] border border-white/15 text-white/20 px-1.5 py-0.5">E</span>
                      )}
                    </span>
                    {song.duration && (
                      <span className="text-[11px] font-mono text-white/20">{song.duration}</span>
                    )}
                    <span className="text-white/15 group-hover:text-white/40 transition-colors text-xs">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Fallback: inline tracklist (when songs table is empty) */}
        {linkedSongs.length === 0 && release.tracklist && release.tracklist.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">Tracklist</p>
              <div className="space-y-0 max-w-2xl">
                {release.tracklist.map((track, i) => (
                  <div key={track.id} className="flex items-center gap-5 py-4 border-b border-white/5 group hover:bg-white/[0.02] px-2 transition-colors">
                    <span className="text-[11px] font-mono text-white/20 min-w-[2rem]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">{track.title}</span>
                    {track.duration && (
                      <span className="ml-auto text-[11px] font-mono text-white/20">{track.duration}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Producer credits */}
        {(release.producerSlugs ?? []).length > 0 && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">Produced By</p>
              <div className="flex flex-wrap gap-3">
                {(release.producerSlugs ?? []).map((pSlug) => (
                  <Link
                    key={pSlug}
                    href={`/producers/${pSlug}`}
                    className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/35 hover:border-white/25 hover:text-white transition-colors"
                  >
                    {pSlug}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Streaming links */}
        {release.streamingLinks && (
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">Stream</p>
              <div className="flex flex-wrap gap-4">
                {Object.entries(release.streamingLinks).map(([platform, url]) => (
                  url && (
                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                      className="border border-white/10 px-6 py-3 text-[10px] tracking-[0.25em] uppercase text-white/50 hover:border-white/30 hover:text-white transition-all duration-300">
                      {platform}
                    </a>
                  )
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
