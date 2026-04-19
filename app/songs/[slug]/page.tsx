import { notFound } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import {
  getSongBySlug,
  getAllPublicSongSlugs,
  getSongsForRelease,
  getReleaseBySlug,
} from "@/lib/cms";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPublicSongSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const song = getSongBySlug(slug);
  return {
    title: song
      ? `${song.title} — ${song.artistName} — SUMG Records`
      : "Song Not Found",
  };
}

export default async function SongPage({ params }: Props) {
  const { slug } = await params;
  const song = getSongBySlug(slug);
  if (!song) notFound();

  const release = song.releaseSlug ? getReleaseBySlug(song.releaseSlug) : undefined;
  const releaseTracks = song.releaseSlug
    ? getSongsForRelease(song.releaseSlug)
    : [];

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative min-h-[50vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
            <span className="text-[28vw] font-black text-white/[0.025] tracking-tighter leading-none">
              {song.title.charAt(0)}
            </span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-40">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-white/20 mb-4">
              <Link href="/songs" className="hover:text-white transition-colors">
                Songs
              </Link>
              <span>/</span>
              <Link
                href={`/artists/${song.artistSlug}`}
                className="hover:text-white transition-colors"
              >
                {song.artistName}
              </Link>
              {release && (
                <>
                  <span>/</span>
                  <Link
                    href={`/releases/${release.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {release.title}
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-start gap-4 flex-wrap mb-3">
              <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none">
                {song.title}
              </h1>
              {song.isExplicit && (
                <span className="border border-white/20 text-white/30 text-[10px] tracking-[0.15em] px-2 py-1 self-end mb-2">
                  EXPLICIT
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] tracking-[0.2em] uppercase text-white/30">
              <Link
                href={`/artists/${song.artistSlug}`}
                className="hover:text-white transition-colors"
              >
                {song.artistName}
              </Link>
              {song.genre && <span className="text-white/15">·</span>}
              {song.genre && <span>{song.genre}</span>}
              {song.duration && <span className="text-white/15">·</span>}
              {song.duration && (
                <span className="font-mono">{song.duration}</span>
              )}
            </div>
          </div>
        </section>

        {/* Audio player */}
        {song.audioUrl && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">
                Listen
              </p>
              <audio
                controls
                src={song.audioUrl}
                className="w-full max-w-xl"
              />
            </div>
          </section>
        )}

        {/* Credits */}
        {(song.producerSlugs ?? []).length > 0 && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">
                Credits
              </p>
              <div className="flex flex-wrap gap-4">
                {(song.producerSlugs ?? []).map((slug) => (
                  <Link
                    key={slug}
                    href={`/producers/${slug}`}
                    className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/25 hover:text-white transition-colors"
                  >
                    {slug}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Lyrics */}
        {song.lyrics && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">
                Lyrics
              </p>
              <pre className="text-sm text-white/50 leading-loose whitespace-pre-wrap max-w-xl font-sans">
                {song.lyrics}
              </pre>
            </div>
          </section>
        )}

        {/* Album context: tracklist if this song belongs to a release */}
        {releaseTracks.length > 1 && release && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
                  From {release.title}
                </p>
                <Link
                  href={`/releases/${release.slug}`}
                  className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
                >
                  View Release →
                </Link>
              </div>
              <div className="space-y-0 max-w-xl">
                {releaseTracks.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/songs/${t.slug}`}
                    className={`flex items-center gap-5 py-3.5 border-b border-white/[0.04] group transition-colors px-2 ${
                      t.slug === song.slug
                        ? "bg-white/[0.04]"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <span className="text-[11px] font-mono text-white/20 min-w-[2rem]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`flex-1 text-sm truncate ${
                        t.slug === song.slug
                          ? "text-white"
                          : "text-white/50 group-hover:text-white/80"
                      } transition-colors`}
                    >
                      {t.title}
                    </span>
                    {t.duration && (
                      <span className="text-[11px] font-mono text-white/20">
                        {t.duration}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Back to artist */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between">
            <Link
              href={`/artists/${song.artistSlug}`}
              className="text-[10px] tracking-[0.25em] uppercase text-white/25 hover:text-white transition-colors"
            >
              ← {song.artistName}
            </Link>
            <Link
              href="/songs"
              className="text-[10px] tracking-[0.25em] uppercase text-white/25 hover:text-white transition-colors"
            >
              All Songs →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
