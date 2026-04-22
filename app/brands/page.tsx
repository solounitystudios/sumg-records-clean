import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { BrandCard } from "@/components/cards/BrandCard";
import { getAllBrands } from "@/lib/cms";

export const metadata = {
  title: "Brand Worlds",
  description:
    "Discover the five brand worlds of SUMG Records — spanning fashion, lifestyle, sound, visual arts, and publishing.",
  openGraph: {
    title: "Brand Worlds — SUMG Records",
    description:
      "Discover the five brand worlds of SUMG Records — spanning fashion, lifestyle, sound, visual arts, and publishing.",
  },
};

export default async function BrandsPage() {
  const brands = await getAllBrands();
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
          {brands.length === 0 && (
            <p className="text-white/20 italic text-sm">No brands yet.</p>
          )}
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
