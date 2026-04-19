import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { BrandCard } from "@/components/cards/BrandCard";
import { brands } from "@/data/brands";

export const metadata = { title: "Brand Worlds — SUMG Records" };

export default function BrandsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="pt-32 pb-16 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">The Ecosystem</p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">Brand Worlds</h1>
          </div>
        </section>
        <section className="py-20 max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
            {brands.map((brand) => (
              <a key={brand.id} href={`/brands/${brand.slug}`} className="block bg-black">
                <BrandCard brand={brand} />
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
