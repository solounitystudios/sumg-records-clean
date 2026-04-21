import { CMSRelease } from "@/lib/types";

interface ReleaseCardProps {
  release: CMSRelease;
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  return (
    <div className="group relative border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent hover:border-white/15 hover:from-white/[0.06] transition-all duration-300 cursor-pointer overflow-hidden">
      {/* Cover art area */}
      <div className="aspect-square relative bg-gradient-to-br from-white/[0.04] to-black/50 flex items-center justify-center overflow-hidden">
        {release.coverArtUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={release.coverArtUrl}
            alt={`${release.title} cover art`}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          />
        ) : (
          <span className="text-[7rem] font-black text-white/[0.04] group-hover:text-white/[0.07] transition-all duration-500 select-none leading-none">
            {release.title.charAt(0)}
          </span>
        )}

        {/* Release type badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-[9px] tracking-[0.25em] uppercase text-white/60 bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-1">
            {release.type}
          </span>
        </div>

        {/* Year */}
        <div className="absolute bottom-3 right-3 z-10">
          <span className="text-[10px] tracking-[0.15em] text-white/40 font-mono bg-black/50 backdrop-blur-sm px-1.5 py-0.5">
            {release.releaseDate}
          </span>
        </div>

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[5]" />
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5 truncate">
          {release.artistName} · {release.genre}
        </p>
        <h3 className="text-base font-bold tracking-tight text-white leading-tight mb-1.5 line-clamp-2">
          {release.title}
        </h3>
        <p className="text-xs text-white/30 leading-relaxed line-clamp-2">
          {release.description}
        </p>

        {release.tracklist && release.tracklist.length > 1 && (
          <p className="text-[9px] tracking-[0.15em] uppercase text-white/15 mt-2.5">
            {release.tracklist.length} tracks
          </p>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-white/20 to-transparent group-hover:w-full transition-all duration-500" />
    </div>
  );
}
