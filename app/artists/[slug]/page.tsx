import { notFound } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ReleaseCard } from "@/components/cards/ReleaseCard";
import { artists } from "@/data/artists";
import { getPublishedReleases } from "@/lib/cms";

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

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative min-h-[60vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
            <span className="text-[30vw] font-black text-white/[0.025] tracking-tighter leading-none">{artist.name.charAt(0)}</span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-40">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">{artist.genre}</p>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none mb-6">{artist.name}</h1>
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

        {/* Releases */}
        {releases.length > 0 && (
          <section className="py-20">
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
