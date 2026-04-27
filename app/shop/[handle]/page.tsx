import { notFound } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/site/Navbar"
import { Footer } from "@/components/site/Footer"
import { ProductCard } from "@/components/shop/ProductCard"
import { AddToCartButton } from "@/components/shop/AddToCartButton"
import { getPublicProducts, getProductByHandle, getProductBuyUrl } from "@/lib/shopify/server"

interface Props {
  params: Promise<{ handle: string }>
}

export async function generateStaticParams() {
  const products = await getPublicProducts()
  return products.map((p) => ({ handle: p.handle }))
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) return { title: "Product Not Found — SUMG Shop" }
  return {
    title: `${product.title} — SUMG Shop`,
    description: product.description ?? `${product.title} by ${product.vendor}`,
    openGraph: {
      title: `${product.title} — SUMG Records Shop`,
      description: product.description ?? `${product.title} by ${product.vendor}`,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params
  const [product, allProducts] = await Promise.all([
    getProductByHandle(handle),
    getPublicProducts(),
  ])

  if (!product || product.status !== "active") notFound()

  const relatedProducts = allProducts
    .filter((p) => p.handle !== handle && p.brandSlug === product.brandSlug)
    .slice(0, 4)

  const soldOut    = product.inventory === 0
  const lowStock   = product.inventory > 0 && product.inventory < 5
  const externalUrl = getProductBuyUrl(product)
  const fmt        = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency }).format(n)

  return (
    <>
      <Navbar />
      <main>

        {/* Breadcrumb */}
        <div className="pt-28 pb-0 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-4">
            <nav className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-white/25">
              <Link href="/shop" className="hover:text-white/60 transition">Shop</Link>
              <span>/</span>
              {product.vendor && (
                <>
                  <Link href={`/shop?brand=${product.brandSlug}`} className="hover:text-white/60 transition">
                    {product.vendor}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="text-white/40">{product.title}</span>
            </nav>
          </div>
        </div>

        {/* Product */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">

              {/* Images */}
              <div className="space-y-3">
                <div className="relative bg-white/[0.02] border border-white/5 overflow-hidden aspect-square">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-black text-[12rem] text-white/[0.03] select-none leading-none">
                        {product.title.charAt(0)}
                      </span>
                    </div>
                  )}

                  {soldOut && (
                    <span className="absolute top-4 left-4 text-[9px] tracking-[0.25em] uppercase bg-black/80 text-white/40 px-3 py-1.5">
                      Sold Out
                    </span>
                  )}
                  {lowStock && (
                    <span className="absolute top-4 left-4 text-[9px] tracking-[0.25em] uppercase bg-yellow-500/10 text-yellow-400/80 px-3 py-1.5">
                      Only {product.inventory} left
                    </span>
                  )}

                  {product.usingFallback && (
                    <span className="absolute bottom-4 right-4 text-[8px] tracking-[0.15em] uppercase bg-white/5 text-white/20 px-2 py-1">
                      Preview
                    </span>
                  )}
                </div>

                {/* Thumbnail strip for additional images */}
                {product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {product.images.slice(1).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt={`${product.title} ${i + 2}`}
                        className="w-20 h-20 object-cover border border-white/5 flex-shrink-0 opacity-60 hover:opacity-100 transition cursor-pointer"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <p className="text-[9px] tracking-[0.35em] uppercase text-white/25">
                      {product.productType}
                    </p>
                    {product.vendor && (
                      <>
                        <span className="text-white/10">·</span>
                        <Link
                          href={`/brands/${product.brandSlug}`}
                          className="text-[9px] tracking-[0.35em] uppercase text-white/25 hover:text-white/50 transition"
                        >
                          {product.vendor}
                        </Link>
                      </>
                    )}
                  </div>

                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight mb-6">
                    {product.title}
                  </h1>

                  <div className="flex items-baseline gap-4 mb-6">
                    <span className="text-3xl font-black text-white">{fmt(product.price)}</span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <span className="text-sm text-white/25 line-through">{fmt(product.compareAtPrice)}</span>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-sm text-white/50 leading-relaxed max-w-md">
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] tracking-[0.2em] uppercase px-2 py-1 border border-white/8 text-white/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Add to cart */}
                <div className="border-t border-white/5 pt-8">
                  {product.variants.length > 0 ? (
                    <AddToCartButton
                      variants={product.variants}
                      soldOut={soldOut}
                      externalUrl={externalUrl}
                    />
                  ) : (
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-white text-black text-[11px] tracking-[0.25em] uppercase px-6 py-4 font-semibold hover:bg-white/90 transition-colors"
                    >
                      Buy on Shopify ↗
                    </a>
                  )}
                </div>

                {/* Brand link */}
                {product.vendor && (
                  <div className="border-t border-white/5 pt-6">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 mb-2">Brand</p>
                    <Link
                      href={`/brands/${product.brandSlug}`}
                      className="text-sm text-white/50 hover:text-white transition"
                    >
                      {product.vendor} →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section className="py-20 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="text-[9px] tracking-[0.4em] uppercase text-white/20 mb-2">
                    {product.vendor}
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    More from this Brand
                  </h2>
                </div>
                <Link
                  href={`/shop?brand=${product.brandSlug}`}
                  className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition"
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04]">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Back to shop */}
        <div className="py-12 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <Link
              href="/shop"
              className="text-[10px] tracking-[0.25em] uppercase text-white/25 hover:text-white transition"
            >
              ← Back to Shop
            </Link>
          </div>
        </div>

      </main>
      <Footer />
    </>
  )
}
