import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ReleaseCard } from "@/components/cards/ReleaseCard";
import { SpotifyArtistCard } from "@/components/SpotifyArtistCard";
import { ArtistCard } from "@/components/cards/ArtistCard";
import { getAllArtists, getArtistBySlug, getArtistReleases, getSongsForArtist } from "@/lib/cms";
import { AudioPlayButton } from "@/components/AudioPlayButton";
import { EmailSignup } from "@/components/site/EmailSignup";
import type { SocialLinks } from "@/lib/types";

interface Props { params: Promise<{ slug: string }> }

const SOCIAL_META: { key: keyof SocialLinks; label: string }[] = [
  { key: "spotify",    label: "Spotify" },
  { key: "instagram",  label: "Instagram" },
  { key: "youtube",    label: "YouTube" },
  { key: "twitter",    label: "X / Twitter" },
  { key: "soundcloud", label: "SoundCloud" },
];

export async function generateStaticParams() {
  return (await getAllArtists()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return { title: "Artist Not Found" };
  const imageUrl = artist.heroImageUrl ?? artist.profileImageUrl;
  const bioDesc = artist.bio
    ? artist.bio.length > 160
      ? `${artist.bio.slice(0, 160)}…`
      : artist.bio
    : `${artist.name} — Artist on SUMG Records.`;
  return {
    title: artist.name,
    description: bioDesc,
    openGraph: {
      title: `${artist.name} — SUMG Records`,
      description: bioDesc,
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
    twitter: {
      card: "summary_large_image",
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  const releases = await getArtistReleases(artist.slug);
  const songs = await getSongsForArtist(artist.slug);
  const allArtists = await getAllArtists();
  const otherArtists = allArtists.filter((a) => a.slug !== artist.slug).slice(0, 3);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — with optional hero image */}
        <section className="relative min-h-[65vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          {artist.heroImageUrl ? (
            <Image
              src={artist.heroImageUrl}
              alt={artist.name}
              fill
              sizes="100vw"
              className="absolute inset-0 object-cover opacity-30"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
              <span className="text-[30vw] font-black text-white/[0.025] tracking-tighter leading-none">
                {artist.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          <div className="absolute top-24 left-0 right-0 z-10">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <a href="/artists" className="text-[10px] tracking-[0.25em] uppercase text-white/25 hover:text-white/60 transition-colors duration-300">
                ← Artists
              </a>
            </div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-24 pt-44">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3">{artist.genre}</p>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none mb-6">
              {artist.name}
            </h1>
            <p className="text-base text-white/60 max-w-xl leading-relaxed">{artist.bio}</p>

            {artist.socialLinks && (
              <div className="flex flex-wrap gap-2 mt-6">
                {SOCIAL_META.filter(({ key }) => artist.socialLinks?.[key]).map(({ key, label }) => (
                  <a
                    key={key}
                    href={artist.socialLinks?.[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-white/15 px-3.5 py-1.5 text-[10px] tracking-[0.2em] uppercase text-white/40 hover:border-white/35 hover:text-white/80 transition-all duration-300"
                  >
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {artist.longBio && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="max-w-2xl">
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">About</p>
                <p className="text-base text-white/65 leading-loose">{artist.longBio}</p>
              </div>
            </div>
          </section>
        )}

        {songs.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="flex items-center justify-between mb-8">
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">Songs</p>
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
                    className="flex items-center gap-5 py-4 border-b border-white/[0.04] group hover:bg-white/[0.025] hover:border-white/[0.08] px-3 transition-all duration-200"
                  >
                    <span className="text-[11px] font-mono text-white/20 min-w-[2rem]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <AudioPlayButton audioUrl={song.audioUrl} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white/70 group-hover:text-white transition-colors duration-200 font-medium">
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
                    <span className="text-white/10 group-hover:text-white/50 transition-colors duration-200 text-xs">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {releases.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-8">Discography</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {releases.map((r) => (
                  <Link key={r.id} href={`/releases/${r.slug}`}>
                    <ReleaseCard release={r} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {artist.socialLinks?.spotify && (
          <SpotifyArtistCard spotifyUrl={artist.socialLinks.spotify} />
        )}

        <section className="py-14 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-white/[0.06] px-6 py-6 hover:border-white/12 transition-colors">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-1.5">Merchandise</p>
                <p className="text-base font-semibold text-white/80">
                  {artist.shopUrl ? `Shop ${artist.name}` : "Shop SUMG"}
                </p>
                <p className="text-xs text-white/35 mt-1">Apparel, accessories &amp; exclusive drops.</p>
              </div>
              <a
                href={artist.shopUrl ?? "/brands"}
                target={artist.shopUrl ? "_blank" : undefined}
                rel={artist.shopUrl ? "noopener noreferrer" : undefined}
                className="flex-shrink-0 inline-flex items-center gap-3 text-[10px] tracking-[0.25em] uppercase text-black bg-white hover:bg-white/90 px-6 py-3 transition-all duration-300"
              >
                Shop Now <span className="text-black/40">→</span>
              </a>
            </div>
          </div>
        </section>

        {otherArtists.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="flex items-center justify-between mb-8">
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">More from SUMG</p>
                <Link
                  href="/artists"
                  className="text-[10px] tracking-[0.2em] uppercase text-white/20 hover:text-white transition-colors"
                >
                  All Artists →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {otherArtists.map((a) => (
                  <Link key={a.id} href={`/artists/${a.slug}`}>
                    <ArtistCard artist={a} size="small" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <EmailSignup />
      </main>
      <Footer />
    </>
  );
}
