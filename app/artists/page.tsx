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
        <section className="pt-32 pb-16 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">Roster</p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">Artists</h1>
          </div>
        </section>
        <section className="py-20 max-w-7xl mx-auto px-6 lg:px-10">
          {artists.length === 0 && (
            <p className="text-white/20 italic text-sm">No artists yet.</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {artists.map((artist) => (
              <a key={artist.id} href={`/artists/${artist.slug}`}>
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
