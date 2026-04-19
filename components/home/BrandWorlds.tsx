import { brands } from "@/data/brands";
import { BrandCard } from "@/components/cards/BrandCard";

export function BrandWorlds() {
  return (
    <section id="brands" className="py-28 border-t border-white/5 bg-black">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
            The Ecosystem
          </p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none mb-4">
            Brand Worlds
          </h2>
          <p className="text-sm text-white/30 max-w-[440px] mx-auto leading-relaxed">
            SUMG extends beyond music — into fashion, culture, visual arts, and
            publishing. Each brand is a world.
          </p>
        </div>

        {/* Brand grid — 3 + 2 layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 mb-px">
          {brands.slice(0, 3).map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
          {brands.slice(3).map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
}
