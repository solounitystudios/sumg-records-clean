import Link from "next/link";
import { CMSArtist } from "@/lib/types";

interface ArtistCardProps {
  artist: CMSArtist;
  size?: "large" | "small";
}

export function ArtistCard({ artist, size = "large" }: ArtistCardProps) {
  const isLarge = size === "large";
  const imageUrl = artist.profileImageUrl ?? artist.heroImageUrl;

  return (
    <div
      className={`group relative overflow-hidden border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent transition-all duration-500 hover:border-white/15 hover:from-white/[0.06] ${
        isLarge ? "aspect-[3/4]" : "aspect-[4/5]"
      }`}
    >
      {/* Profile image or initial */}
      {artist.profileImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artist.profileImageUrl}
          alt={artist.name}
          className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-all duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-5 group-hover:opacity-[0.08] transition-opacity duration-500">
    <Link
      href={`/artists/${artist.slug}`}
      className={`group relative overflow-hidden border border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent transition-all duration-500 hover:border-white/10 hover:from-white/[0.06] ${
        isLarge ? "aspect-[3/4]" : "aspect-[4/5]"
      }`}
    >
      {/* Real artist image */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={artist.name}
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity duration-500"
        />
      ) : (
        /* Faded initial fallback when no image is available */
        <div className="absolute inset-0 flex items-center justify-center opacity-5 group-hover:opacity-[0.07] transition-opacity duration-500">
          <span
            className={`font-black tracking-tighter text-white select-none ${
              isLarge ? "text-[12rem]" : "text-[8rem]"
            }`}
          >
            {artist.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Gradient overlay — stronger at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 z-10" />

      {/* Decorative top-right accent */}
      <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-white/20 to-transparent z-20" />
      <div className="absolute top-0 right-0 w-px h-16 bg-gradient-to-b from-white/20 to-transparent z-20" />
      {/* Background gradient block */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 z-10" />

      {/* Decorative top-right accent */}
      <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-white/20 to-transparent" />
      <div className="absolute top-0 right-0 w-px h-16 bg-gradient-to-b from-white/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-5">
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
        {/* View link that appears on hover */}
        <div className="mt-3 overflow-hidden h-0 group-hover:h-5 transition-all duration-300">
          <span className="text-[9px] tracking-[0.25em] uppercase text-white/50">
            View Profile →
          </span>
        </div>
      </div>

      {/* Hover bottom line */}
      <div className="absolute bottom-0 left-0 w-0 h-px bg-white/30 group-hover:w-full transition-all duration-500 z-30" />
    </Link>
  );
}
