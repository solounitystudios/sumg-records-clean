import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getPublishedReleases, getReleaseBySlug, getSongsForRelease, getAllProducers, getArtistBySlug } from "@/lib/cms";
import { DSPButtonGroup } from "@/components/admin/DSPLinksPanel";
import { SpotifyReleasePanel } from "@/components/SpotifyReleasePanel";
import { AudioPlayButton } from "@/components/AudioPlayButton";
import { EmailCapture } from "@/components/site/EmailCapture";

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await getPublishedReleases()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const release = await getReleaseBySlug(slug);
  if (!release) return { title: "Release Not Found" };
  const rawDesc = release.description
    ? release.description
    : `${release.title} by ${release.artistName} — available on SUMG Records.`;
  const desc = rawDesc.length > 160 ? `${rawDesc.slice(0, 160)}…` : rawDesc;
  return {
    title: release.title,
    description: desc,
    openGraph: {
      title: `${release.title} — SUMG Records`,
      description: desc,
      ...(release.coverArtUrl ? { images: [{ url: release.coverArtUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(release.coverArtUrl ? { images: [release.coverArtUrl] } : {}),
    },
  };
}

export default async function ReleasePage({ params }: Props) {
  const { slug } = await params;
  const release = await getReleaseBySlug(slug);
  if (!release) notFound();

  const linkedSongs = await getSongsForRelease(slug);
  const allProducers = await getAllProducers();
  const producerCredits = (release.producerSlugs ?? []).map((pSlug) => ({
    slug: pSlug,
    name: allProducers.find((p) => p.slug === pSlug)?.name ?? pSlug,
  }));
  const artist = await getArtistBySlug(release.artistSlug);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative min-h-[60vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          {release.coverArtUrl ? (
            <Image
              src={release.coverArtUrl}
              alt={release.title}
              fill
              sizes="100vw"
              className="absolute inset-0 object-cover opacity-25"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
              <span className="text-[30vw] font-black text-white/[0.025] tracking-tighter leading-none">
                {release.title.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

          {release.coverArtUrl && (
            <div className="absolute right-8 bottom-8 w-36 h-36 md:w-56 md:h-56 border border-white/10 overflow-hidden hidden md:block shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={release.coverArtUrl}
                alt={`${release.title} cover art`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="absolute top-24 left-0 right-0 z-10">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <Link href="/releases" className="text-[10px] tracking-[0.25em] uppercase text-white/25 hover:text-white/60 transition-colors duration-300">
                ← Releases
              </Link>
            </div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-24 pt-44">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-2">
              <Link href={`/artists/${release.artistSlug}`} className="hover:text-white/60 transition-colors">
                {release.artistName}
              </Link>
              {" "}· {release.type} · {release.genre}
            </p>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none mb-6">
              {release.title}
            </h1>
            <p className="text-base text-white/40 max-w-xl">{release.description}</p>
            {release.releaseDate && (
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 mt-4">
                {new Date(release.releaseDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
        </section>

        {/* Cover art — full display on mobile */}
        {release.coverArtUrl && (
          <section className="py-12 border-b border-white/5 md:hidden">
            <div className="max-w-7xl mx-auto px-6">
              <div className="relative w-48 h-48 border border-white/10 overflow-hidden">
                <Image
                  src={release.coverArtUrl}
                  alt={`${release.title} cover art`}
                  fill
                  sizes="192px"
                  className="object-cover"
                />
              </div>
            </div>
          </section>
        )}

        {/* Linked songs from songs table */}
        {linkedSongs.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">Tracklist</p>
              <div className="space-y-0 max-w-2xl">
                {linkedSongs.map((song, i) => (
                  <Link
                    key={song.id}
                    href={`/songs/${song.slug}`}
                    className="flex items-center gap-5 py-4 border-b border-white/[0.05] group hover:bg-white/[0.025] hover:border-white/[0.08] px-3 transition-all duration-200"
                  >
                    <span className="text-[11px] font-mono text-white/20 min-w-[2rem]">
                      {String(song.trackNumber ?? i + 1).padStart(2, "0")}
                    </span>
                    <AudioPlayButton audioUrl={song.audioUrl} />
                    <span className="flex-1 text-sm text-white/70 group-hover:text-white transition-colors">
                      {song.title}
                      {song.isExplicit && (
                        <span className="ml-2 text-[9px] border border-white/15 text-white/20 px-1.5 py-0.5">E</span>
                      )}
                    </span>
                    {song.duration && (
                      <span className="text-[11px] font-mono text-white/20">{song.duration}</span>
                    )}
                    <span className="text-white/15 group-hover:text-white/50 transition-colors duration-200 text-xs">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Fallback: inline tracklist when songs table is empty */}
        {linkedSongs.length === 0 && release.tracklist && release.tracklist.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">Tracklist</p>
              <div className="space-y-0 max-w-2xl">
                {release.tracklist.map((track, i) => (
                  <div key={track.id} className="flex items-center gap-5 py-4 border-b border-white/5 group hover:bg-white/[0.02] px-2 transition-colors">
                    <span className="text-[11px] font-mono text-white/20 min-w-[2rem]">
                      {String(track.trackNumber ?? i + 1).padStart(2, "0")}
                    </span>
                    <AudioPlayButton audioUrl={track.audioUrl} />
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
        {producerCredits.length > 0 && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">Produced By</p>
              <div className="flex flex-wrap gap-3">
                {producerCredits.map(({ slug: pSlug, name }) => (
                  <Link
                    key={pSlug}
                    href={`/producers/${pSlug}`}
                    className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/35 hover:border-white/25 hover:text-white transition-colors"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured artists */}
        {(release.featuredArtistSlugs ?? []).length > 0 && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">Featuring</p>
              <div className="flex flex-wrap gap-3">
                {(release.featuredArtistSlugs ?? []).map((aSlug) => (
                  <Link
                    key={aSlug}
                    href={`/artists/${aSlug}`}
                    className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-white/35 hover:border-white/25 hover:text-white transition-colors"
                  >
                    {aSlug}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* DSP streaming links */}
        {release.dspLinks && Object.values(release.dspLinks).some(Boolean) && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">Listen On</p>
              <DSPButtonGroup links={release.dspLinks} />
            </div>
          </section>
        )}

        {/* Spotify enrichment — album art, tracklist, metadata */}
        {release.dspLinks?.spotify && (
          <SpotifyReleasePanel
            spotifyUrl={release.dspLinks.spotify}
            hasCoverArt={!!release.coverArtUrl}
          />
        )}

        {/* Merch CTA */}
        <section className="py-12 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-white/[0.06] px-6 py-6 hover:border-white/10 transition-colors">
              <div>
                <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-1">Official Merch</p>
                <p className="text-sm text-white/60">
                  Shop apparel, accessories, and limited editions from the SUMG brand worlds.
                </p>
              </div>
              <Link
                href="/brands"
                className="bg-white text-black text-[10px] tracking-[0.25em] uppercase px-6 py-3 hover:bg-white/90 transition-colors shrink-0"
              >
                Shop Now →
              </Link>
            </div>
          </div>
        </section>

        {/* Artist CTA */}
        {artist && (
          <section className="py-12 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <Link
                href={`/artists/${release.artistSlug}`}
                className="flex items-center justify-between group border border-white/[0.06] px-6 py-5 hover:border-white/15 transition-colors"
              >
                <div className="flex items-center gap-5">
                  {artist.profileImageUrl && (
                    <Image
                      src={artist.profileImageUrl}
                      alt={artist.name}
                      width={48}
                      height={48}
                      className="object-cover rounded-full border border-white/10"
                    />
                  )}
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-0.5">Artist</p>
                    <p className="text-base font-semibold text-white/70 group-hover:text-white transition-colors">
                      {artist.name}
                    </p>
                    {artist.genre && (
                      <p className="text-[10px] text-white/25">{artist.genre}</p>
                    )}
                  </div>
                </div>
                <span className="text-white/20 group-hover:text-white transition-colors text-xl">→</span>
              </Link>
            </div>
          </section>
        )}

        {/* Email capture */}
        <section className="py-16 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 max-w-xl">
            <EmailCapture
              source="release"
              variant="inline"
              heading="Stay in the loop"
              subtext="New releases, merch drops, and label dispatches. No spam."
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
