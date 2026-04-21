import { CMSBrand } from "@/lib/types";

interface BrandCardProps {
  brand: CMSBrand;
}

export function BrandCard({ brand }: BrandCardProps) {
  return (
    <div className="group relative p-8 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent hover:border-white/10 hover:from-white/[0.05] transition-all duration-500 cursor-default">
      {/* Category tag */}
      <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-5">
        {brand.category}
      </p>

      {/* Brand name */}
      <h3 className="text-2xl font-bold tracking-tight text-white mb-4 group-hover:tracking-wide transition-all duration-500">
        {brand.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-white/40 leading-relaxed mb-6">
        {brand.descriptor}
      </p>

      {/* Tagline */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 italic">
        &ldquo;{brand.tagline}&rdquo;
      </p>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/20 transition-all duration-500" />

      {/* Corner accent */}
      <div className="absolute top-0 left-0 w-0 h-0 group-hover:w-8 group-hover:h-px bg-white/20 transition-all duration-500" />
      <div className="absolute top-0 left-0 w-0 h-0 group-hover:w-px group-hover:h-8 bg-white/20 transition-all duration-500" />
    </div>
  );
}
