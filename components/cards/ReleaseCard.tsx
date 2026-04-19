import { Release } from "@/data/releases";

interface ReleaseCardProps {
  release: Release;
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  return (
    <div className="group relative border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent hover:border-white/10 hover:from-white/[0.06] transition-all duration-400 cursor-default overflow-hidden">
      {/* Type badge area */}
      <div className="aspect-square relative bg-gradient-to-br from-white/[0.04] to-black/50 flex items-center justify-center overflow-hidden">
        {/* Large initial */}
        <span className="text-[7rem] font-black text-white/[0.04] group-hover:text-white/[0.06] transition-all duration-500 select-none leading-none">
          {release.title.charAt(0)}
        </span>

        {/* Release type badge */}
        <div className="absolute top-4 left-4">
          <span className="text-[9px] tracking-[0.25em] uppercase text-white/30 border border-white/10 px-2 py-1">
            {release.type}
          </span>
        </div>

        {/* Year */}
        <div className="absolute bottom-4 right-4">
          <span className="text-[10px] tracking-[0.15em] text-white/20 font-mono">
            {release.releaseDate}
          </span>
        </div>

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1.5">
          {release.artist} · {release.genre}
        </p>
        <h3 className="text-xl font-bold tracking-tight text-white leading-tight mb-2">
          {release.title}
        </h3>
        <p className="text-xs text-white/35 leading-relaxed line-clamp-2">
          {release.description}
        </p>

        {release.tracklist && release.tracklist.length > 1 && (
          <p className="text-[9px] tracking-[0.15em] uppercase text-white/15 mt-3">
            {release.tracklist.length} tracks
          </p>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-white/20 to-transparent group-hover:w-full transition-all duration-500" />
    </div>
  );
}
