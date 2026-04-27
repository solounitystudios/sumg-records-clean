import { CMSArtist } from "@/lib/types";
import { ArtistCard } from "@/components/cards/ArtistCard";
import Link from "next/link";

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
    <section id="artists" className="py-28 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Section header — always its own full row, never overlapping cards */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
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
          <div className="flex flex-col md:items-end gap-3">
            <p className="text-xs text-white/25 max-w-[240px] md:text-right leading-relaxed">
              Seven voices. One label. An ecosystem built on sound and vision.
            </p>
            <Link
              href="/artists"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-white/30 hover:text-white border-b border-white/10 hover:border-white/40 pb-0.5 transition-all duration-300 self-start md:self-auto"
            >
              All Artists <span className="text-white/20">→</span>
            </Link>
          </div>
        </div>

        {/* Artist grid — starts clearly below the header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visible.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} size="large" />
          ))}
        </div>

        {/* Scrolling name ticker */}
        <div className="mt-16 overflow-hidden border-t border-b border-white/5 py-4">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...visible, ...visible].map((artist, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-6 px-8 text-[10px] tracking-[0.35em] uppercase text-white/20"
              >
                {artist.name}
                <span className="text-white/10">·</span>
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
