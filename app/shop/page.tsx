import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getPublicProducts, getProductBuyUrl } from "@/lib/shopify/server";
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
                {products.map((product) => {
                  const buyUrl = getProductBuyUrl(product);
                  const isExternal = buyUrl.startsWith("https://");
                  return (
                    <div
                      key={product.id}
                      className="bg-black p-6 flex flex-col gap-4 group"
                    >
                      {/* Cover image or initial */}
                      <div className="aspect-square bg-white/[0.02] flex items-center justify-center border border-white/5 overflow-hidden">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[6rem] font-black text-white/[0.04] select-none leading-none">
                            {product.title.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 space-y-1">
                        <p className="text-[9px] tracking-[0.25em] uppercase text-white/25">
                          {product.productType} · {product.vendor}
                        </p>
                        <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors leading-snug">
                          {product.title}
                        </p>
                        {product.description && (
                          <p className="text-xs text-white/30 leading-relaxed line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>

                      {/* Price + CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <p className="text-base font-black text-white">
                          ${product.price.toFixed(2)}
                        </p>
                        <a
                          href={buyUrl}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noopener noreferrer" : undefined}
                          className="bg-white text-black text-[10px] tracking-[0.2em] uppercase px-5 py-2 hover:bg-white/90 transition-colors"
                        >
                          {isExternal ? "Buy Now ↗" : "Enquire →"}
                        </a>
                      </div>

                      {/* Low-stock warning */}
                      {product.inventory > 0 && product.inventory < 5 && (
                        <p className="text-[9px] tracking-[0.15em] uppercase text-yellow-400/60">
                          Only {product.inventory} left
                        </p>
                      )}
                    </div>
                  );
                })}
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
