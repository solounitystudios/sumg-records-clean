import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ArtistCard } from "@/components/cards/ArtistCard";
import { getAllArtists } from "@/lib/cms";

export const metadata = {
  title: "Artists",
  description:
    "Explore the SUMG Records artist roster — seven independent artists each with a distinct sound, vision, and world.",
  openGraph: {
    title: "Artists — SUMG Records",
    description:
      "Explore the SUMG Records artist roster — seven independent artists each with a distinct sound, vision, and world.",
  },
};

export default async function ArtistsPage() {
  const artists = await getAllArtists();
  return (
    <>
      <Navbar />
      <main>
        {/* Page hero */}
        <section className="relative pt-36 pb-20 border-b border-white/5 overflow-hidden">
          {/* Background watermark */}
          <div className="absolute inset-0 flex items-center justify-end pr-10 select-none pointer-events-none overflow-hidden">
            <span className="text-[18vw] font-black text-white/[0.018] tracking-tighter leading-none">
              ROSTER
            </span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
                  Roster
                </p>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">
                  Artists
                </h1>
              </div>
              <p className="hidden md:block text-xs text-white/25 max-w-[200px] text-right leading-relaxed">
                Seven voices. One ecosystem.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 max-w-7xl mx-auto px-6 lg:px-10">
          {artists.length === 0 && (
            <p className="text-white/20 italic text-sm">No artists yet.</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {artists.map((artist) => (
              <a key={artist.id} href={`/artists/${artist.slug}`} className="block">
                <ArtistCard artist={artist} size={artist.tier === "primary" ? "large" : "small"} />
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
