import { Artist } from "@/data/artists";

interface ArtistCardProps {
  artist: Artist;
  size?: "large" | "small";
}

export function ArtistCard({ artist, size = "large" }: ArtistCardProps) {
  const isLarge = size === "large";

  return (
    <div
      className={`group relative overflow-hidden border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent transition-all duration-500 hover:border-white/10 hover:from-white/[0.06] ${
        isLarge ? "aspect-[3/4]" : "aspect-[4/5]"
      }`}
    >
      {/* Background gradient block */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 z-10" />

      {/* Decorative top-right accent */}
      <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-white/20 to-transparent" />
      <div className="absolute top-0 right-0 w-px h-16 bg-gradient-to-b from-white/20 to-transparent" />

      {/* Artist initial placeholder */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 group-hover:opacity-[0.07] transition-opacity duration-500">
        <span
          className={`font-black tracking-tighter text-white select-none ${
            isLarge ? "text-[12rem]" : "text-[8rem]"
          }`}
        >
          {artist.name.charAt(0)}
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
        <p className="text-[10px] tracking-[0.25em] uppercase text-white/30 mb-1.5">
          {artist.genre}
        </p>
        <h3
          className={`font-bold tracking-tight text-white leading-none mb-2 ${
            isLarge ? "text-2xl" : "text-xl"
          }`}
        >
          {artist.name}
        </h3>
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
          {artist.bio}
        </p>
      </div>

      {/* Hover bottom line */}
      <div className="absolute bottom-0 left-0 w-0 h-px bg-white/30 group-hover:w-full transition-all duration-500 z-30" />
    </div>
  );
}
