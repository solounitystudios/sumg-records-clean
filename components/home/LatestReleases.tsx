import { CMSRelease } from "@/lib/types";
import { ReleaseCard } from "@/components/cards/ReleaseCard";

interface Props {
  releases: CMSRelease[];
}

export function LatestReleases({ releases }: Props) {
  return (
    <section
      id="releases"
      className="py-28 border-t border-white/5"
      style={{
        background:
          "linear-gradient(180deg, #0a0a0a 0%, #111111 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-14">
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
              Catalogue
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none">
              Latest
              <br />
              <span className="text-white/40">Releases</span>
            </h2>
          </div>
          <a
            href="#"
            className="hidden md:inline-flex items-center gap-3 text-[10px] tracking-[0.25em] uppercase text-white/40 hover:text-white border-b border-white/10 hover:border-white/40 pb-0.5 transition-all duration-300"
          >
            View All
            <span className="text-white/20">→</span>
          </a>
        </div>

        {/* Release grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-10 text-center md:hidden">
          <a
            href="#"
            className="inline-flex items-center gap-3 text-[10px] tracking-[0.25em] uppercase text-white/40 hover:text-white border-b border-white/10 hover:border-white/40 pb-0.5 transition-all duration-300"
          >
            View All Releases
          </a>
        </div>
      </div>
    </section>
  );
}
