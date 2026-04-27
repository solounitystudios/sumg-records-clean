import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/shop/ProductCard";
import { getPublicProducts } from "@/lib/shopify/server";
import Link from "next/link";

export const metadata = { title: "Shop — SUMG Records" };

interface Props {
  searchParams: Promise<{ brand?: string }>;
}

export default async function ShopPage({ searchParams }: Props) {
  const { brand } = await searchParams;
  const allProducts = await getPublicProducts();
  const products = brand
    ? allProducts.filter((p) => p.brandSlug === brand)
    : allProducts;
  const brands = Array.from(new Set(allProducts.map((p) => p.brandSlug))).sort();

  // Featured drops: tagged "featured" first, then newest, capped at 4
  const featured = allProducts
    .filter((p) => p.inventory > 0)
    .sort((a, b) => {
      const aFeat = a.tags?.includes("featured") ? 1 : 0;
      const bFeat = b.tags?.includes("featured") ? 1 : 0;
      if (bFeat !== aFeat) return bFeat - aFeat;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, 4);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
              Merch &amp; Products
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none mb-4">
              Shop
            </h1>
            <p className="text-sm text-white/35 max-w-md leading-relaxed">
              Official merchandise from SUMG Records and its brand worlds.
            </p>
          </div>
        </section>

        {/* Featured drops */}
        {!brand && featured.length > 0 && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="text-[9px] tracking-[0.4em] uppercase text-white/20 mb-2">New &amp; Now</p>
                  <h2 className="text-3xl font-black tracking-tight text-white leading-none">Featured Drops</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04]">
                {featured.map((p) => (
                  <ProductCard key={p.id} product={p} featured />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Brand filters */}
        <section className="py-5 border-b border-white/5 sticky top-16 bg-black/95 backdrop-blur-xl z-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/shop"
                className={`text-[10px] tracking-[0.2em] uppercase px-4 py-2 border transition-colors duration-200 ${
                  !brand
                    ? "border-white/40 text-white"
                    : "border-white/10 text-white/35 hover:border-white/25 hover:text-white/60"
                }`}
              >
                All
              </Link>
              {brands.map((b) => (
                <Link
                  key={b}
                  href={`/shop?brand=${b}`}
                  className={`text-[10px] tracking-[0.2em] uppercase px-4 py-2 border transition-colors duration-200 ${
                    brand === b
                      ? "border-white/40 text-white"
                      : "border-white/10 text-white/35 hover:border-white/25 hover:text-white/60"
                  }`}
                >
                  {b}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Product grid */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            {products.length === 0 ? (
              <p className="text-sm text-white/30">No products available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-white/[0.04]">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Brand world links */}
        <section className="py-16 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 mb-6">
              Explore Brand Worlds
            </p>
            <div className="flex flex-wrap gap-4">
              {brands.map((b) => (
                <Link
                  key={b}
                  href={`/brands/${b}`}
                  className="border border-white/10 px-5 py-2 text-[10px] tracking-[0.2em] uppercase text-white/35 hover:border-white/30 hover:text-white transition-colors"
                >
                  {b} →
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
