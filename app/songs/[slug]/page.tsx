import { notFound } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import {
  getSongBySlug,
  getAllPublicSongSlugs,
  getSongsForRelease,
  getSongsForArtist,
  getReleaseBySlug,
  getAllProducers,
} from "@/lib/cms";
import { DSPButtonGroup } from "@/components/admin/DSPLinksPanel";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getAllPublicSongSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return { title: "Song Not Found" };
  const release = song.releaseSlug ? await getReleaseBySlug(song.releaseSlug) : undefined;
  const imageUrl = release?.coverArtUrl;
  return {
    title: `${song.title} — ${song.artistName} — SUMG Records`,
    ...(imageUrl && {
      openGraph: { images: [{ url: imageUrl }] },
      twitter: { card: "summary_large_image", images: [imageUrl] },
    }),
  const parts = [song.artistName, song.genre].filter(Boolean).join(" · ");
  const desc = parts
    ? `${song.title} by ${parts} — listen on SUMG Records.`
    : `${song.title} — listen on SUMG Records.`;
  return {
    title: `${song.title} — ${song.artistName}`,
    description: desc,
    openGraph: {
      title: `${song.title} — ${song.artistName} — SUMG Records`,
      description: desc,
    },
  };
}

export default async function SongPage({ params }: Props) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  const release = song.releaseSlug ? await getReleaseBySlug(song.releaseSlug) : undefined;
  const releaseTracks = song.releaseSlug
    ? await getSongsForRelease(song.releaseSlug)
    : [];

  // Resolve producer names from the producers table
  const allProducers = await getAllProducers();
  const producerCredits = (song.producerSlugs ?? []).map((pSlug) => ({
    slug: pSlug,
    name: allProducers.find((p) => p.slug === pSlug)?.name ?? pSlug,
  }));

  // Related songs — other songs by this artist (excluding current)
  const relatedSongs = (await getSongsForArtist(song.artistSlug))
    .filter((s) => s.slug !== song.slug)
    .slice(0, 5);

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
        {producerCredits.length > 0 && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">
                Credits
              </p>
              <div className="flex flex-wrap gap-4">
                {producerCredits.map(({ slug: pSlug, name }) => (
                  <Link
                    key={pSlug}
                    href={`/producers/${pSlug}`}
                    className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/25 hover:text-white transition-colors"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* DSP Links */}
        {song.dspLinks && Object.values(song.dspLinks).some(Boolean) && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">
                Listen On
              </p>
              <DSPButtonGroup links={song.dspLinks} />
            </div>
          </section>
        )}

        {/* Linked release CTA */}
        {release && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {release.coverArtUrl && (
                  <Image
                    src={release.coverArtUrl}
                    alt={release.title}
                    width={64}
                    height={64}
                    className="object-cover border border-white/10 flex-shrink-0"
                  />
                )}
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-1">
                    {release.type}
                  </p>
                  <p className="text-sm text-white font-medium">{release.title}</p>
                  <p className="text-[10px] text-white/30">{release.artistName}</p>
                </div>
              </div>
              <Link
                href={`/releases/${release.slug}`}
                className="border border-white/10 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/30 hover:text-white transition-colors shrink-0"
              >
                View Release →
              </Link>
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

        {/* Related songs by same artist */}
        {relatedSongs.length > 0 && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">
                More by {song.artistName}
              </p>
              <div className="space-y-1">
                {relatedSongs.map((s) => (
                  <Link
                    key={s.id}
                    href={`/songs/${s.slug}`}
                    className="flex items-center gap-5 py-3 px-3 border border-transparent hover:border-white/[0.06] hover:bg-white/[0.02] group transition-all"
                  >
                    <span className="flex-1 text-sm text-white/50 group-hover:text-white/80 transition-colors truncate">
                      {s.title}
                    </span>
                    {s.genre && (
                      <span className="text-[10px] tracking-[0.1em] uppercase text-white/20">
                        {s.genre}
                      </span>
                    )}
                    {s.duration && (
                      <span className="text-[11px] font-mono text-white/20">
                        {s.duration}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Artist CTA */}
        <section className="py-12 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <Link
              href={`/artists/${song.artistSlug}`}
              className="flex items-center justify-between group border border-white/[0.06] px-6 py-5 hover:border-white/15 transition-colors"
            >
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-1">
                  Artist
                </p>
                <p className="text-lg font-semibold text-white/70 group-hover:text-white transition-colors">
                  {song.artistName}
                </p>
              </div>
              <span className="text-white/20 group-hover:text-white transition-colors text-xl">
                →
              </span>
            </Link>
          </div>
        </section>

        {/* Back + all songs */}
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
