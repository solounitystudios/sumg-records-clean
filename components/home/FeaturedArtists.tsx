import { CMSArtist } from "@/lib/types";
import { ArtistCard } from "@/components/cards/ArtistCard";

interface Props {
  artists: CMSArtist[];
}

const EXCLUDED_STATUSES = new Set(["archived", "inactive", "draft", "tester", "demo"]);

function isPrimary(a: CMSArtist) {
  return !!(a.featured ?? a.tier === "primary");
}

export function FeaturedArtists({ artists }: Props) {
  const visible = artists
    .filter((a) => !EXCLUDED_STATUSES.has((a as unknown as Record<string, unknown>).status as string))
    .sort((a, b) => Number(isPrimary(b)) - Number(isPrimary(a)));

  return (
    <section id="artists" className="py-28 px-6 lg:px-10 max-w-7xl mx-auto">
      {/* Section header */}
      <div className="flex items-end justify-between mb-14">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
            Roster
          </p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none">
            Featured
            <br />
            <span className="text-white/40">Artists</span>
          </h2>
        </div>
        <div className="flex flex-col items-end gap-4">
          <p className="hidden md:block text-xs text-white/25 max-w-[220px] text-right leading-relaxed">
            Seven voices. One label. An ecosystem built on sound and vision.
          </p>
          <a
            href="/artists"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-white/30 hover:text-white border-b border-white/10 hover:border-white/40 pb-0.5 transition-all duration-300"
          >
            All Artists <span className="text-white/20">→</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map((artist) => (
          <a key={artist.id} href={`/artists/${artist.slug}`} className="block">
            <ArtistCard artist={artist} size="large" />
          </a>
        ))}
      </div>
    </section>
  );
}
