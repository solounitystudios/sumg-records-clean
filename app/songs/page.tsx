import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getPublicSongs } from "@/lib/cms";
import Link from "next/link";

export const metadata = {
  title: "Songs — SUMG Records",
};

export default function SongsPage() {
  const songs = getPublicSongs().sort((a, b) => {
    // Sort by release date (newest first), then alphabetically
    if (a.releaseSlug && b.releaseSlug) {
      return a.title.localeCompare(b.title);
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative min-h-[30vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
            <span className="text-[20vw] font-black text-white/[0.025] tracking-tighter leading-none">
              ♫
            </span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-16 pt-32">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
              SUMG Records · Catalogue
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">
              Songs
            </h1>
          </div>
        </section>

        {/* Song list */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            {songs.length === 0 ? (
              <p className="text-white/20 text-sm italic">No songs available yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {songs.map((song, i) => (
                  <Link
                    key={song.id}
                    href={`/songs/${song.slug}`}
                    className="flex items-center gap-5 py-4 px-2 group hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Index */}
                    <span className="text-[11px] font-mono text-white/15 min-w-[2.5rem]">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">
                        {song.title}
                        {song.isExplicit && (
                          <span className="ml-2 text-[9px] tracking-[0.1em] border border-white/15 text-white/25 px-1.5 py-0.5">
                            E
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-white/25 truncate mt-0.5">
                        {song.artistName}
                        {song.releaseName && (
                          <span className="text-white/15"> · {song.releaseName}</span>
                        )}
                        {song.genre && (
                          <span className="text-white/15"> · {song.genre}</span>
                        )}
                      </p>
                    </div>

                    {/* Duration */}
                    {song.duration && (
                      <span className="text-[11px] font-mono text-white/20 flex-shrink-0">
                        {song.duration}
                      </span>
                    )}

                    {/* Arrow */}
                    <span className="text-white/10 group-hover:text-white/40 transition-colors text-sm flex-shrink-0">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
