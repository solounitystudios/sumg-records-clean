import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ReleaseCard } from "@/components/cards/ReleaseCard";
import { getPublishedReleases } from "@/lib/cms";

export const metadata = {
  title: "Releases",
  description:
    "Browse the full SUMG Records catalogue — singles, EPs, albums, and projects from our independent artist roster.",
  openGraph: {
    title: "Releases — SUMG Records",
    description:
      "Browse the full SUMG Records catalogue — singles, EPs, albums, and projects from our independent artist roster.",
  },
};

export default async function ReleasesPage() {
  const releases = await getPublishedReleases();
  return (
    <>
      <Navbar />
      <main>
        {/* Page hero */}
        <section className="relative pt-36 pb-20 border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-end pr-10 select-none pointer-events-none overflow-hidden">
            <span className="text-[18vw] font-black text-white/[0.018] tracking-tighter leading-none">
              CATALOGUE
            </span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
                  Catalogue
                </p>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">
                  Releases
                </h1>
              </div>
              <p className="hidden md:block text-xs text-white/25 max-w-[200px] text-right leading-relaxed">
                Every release is built with intention.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 max-w-7xl mx-auto px-6 lg:px-10">
          {releases.length === 0 && (
            <p className="text-white/20 italic text-sm">No releases yet.</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {releases.map((release) => (
              <a key={release.id} href={`/releases/${release.slug}`} className="block">
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
