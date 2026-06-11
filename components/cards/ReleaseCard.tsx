import { CMSRelease } from "@/lib/types";

interface ReleaseCardProps {
  release: CMSRelease;
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  const trackCount = release.tracklist?.length ?? 0;

  return (
    <div className="group relative aspect-square overflow-hidden border border-white/5 bg-gradient-to-br from-white/[0.04] to-black/50 hover:border-white/15 transition-all duration-300 cursor-pointer">
      {/* Artwork — fills the card and is the dominant visual */}
      {release.coverArtUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={release.coverArtUrl}
          alt={`${release.title} cover art`}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
        />
      ) : (
        /* Fallback only when no artwork exists */
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[7rem] font-black text-white/[0.05] group-hover:text-white/[0.08] transition-all duration-500 select-none leading-none">
            {release.title.charAt(0)}
          </span>
        </div>
      )}

      {/* Release type badge */}
      <div className="absolute top-3 left-3 z-10">
        <span className="text-[9px] tracking-[0.25em] uppercase text-white/70 bg-black/55 backdrop-blur-sm border border-white/10 px-2 py-1">
          {release.type}
        </span>
      </div>

      {/* Year */}
      <div className="absolute top-3 right-3 z-10">
        <span className="text-[10px] tracking-[0.15em] text-white/50 font-mono bg-black/45 backdrop-blur-sm px-1.5 py-0.5">
          {release.releaseDate}
        </span>
      </div>

      {/* Metadata overlaid on the artwork */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 pt-14 bg-gradient-to-t from-black/90 via-black/45 to-transparent">
        <p className="text-[9px] tracking-[0.25em] uppercase text-white/45 mb-1 truncate">
          {release.artistName}
          {release.genre ? ` · ${release.genre}` : ""}
        </p>
        <h3 className="text-sm md:text-base font-bold tracking-tight text-white leading-tight line-clamp-2">
          {release.title}
        </h3>
        {trackCount > 1 && (
          <p className="text-[9px] tracking-[0.15em] uppercase text-white/35 mt-1.5">
            {trackCount} tracks
          </p>
        )}
      </div>

      {/* Bottom accent line on hover */}
      <div className="absolute bottom-0 left-0 z-20 w-0 h-px bg-gradient-to-r from-white/40 to-transparent group-hover:w-full transition-all duration-500" />
    </div>
  );
}
