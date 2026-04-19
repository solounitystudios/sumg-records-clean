import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ReleaseCard } from "@/components/cards/ReleaseCard";
import { getPublishedReleases } from "@/lib/cms";

export const metadata = { title: "Releases — SUMG Records" };

export default function ReleasesPage() {
  const releases = getPublishedReleases();
  return (
    <>
      <Navbar />
      <main>
        <section className="pt-32 pb-16 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">Catalogue</p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">Releases</h1>
          </div>
        </section>
        <section className="py-20 max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {releases.map((release) => (
              <a key={release.id} href={`/releases/${release.slug}`}>
                <ReleaseCard release={release} />
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
