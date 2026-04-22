import { CMSBrand } from "@/lib/types";

interface BrandCardProps {
  brand: CMSBrand;
}

export function BrandCard({ brand }: BrandCardProps) {
  return (
    <div className="group relative p-8 border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent hover:border-white/10 hover:from-white/[0.05] transition-all duration-500 cursor-pointer">
      {/* Category tag */}
      <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-6">
        {brand.category}
      </p>

      {/* Brand name */}
      <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 group-hover:text-white transition-colors duration-300">
        {brand.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-white/40 leading-relaxed mb-6 max-w-xs">
        {brand.descriptor}
      </p>

      {/* Tagline */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 italic group-hover:text-white/35 transition-colors duration-300">
        &ldquo;{brand.tagline}&rdquo;
      </p>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/25 transition-all duration-500" />
    </div>
  );
}
