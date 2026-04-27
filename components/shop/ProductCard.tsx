"use client"

import { useState } from "react"
import Link from "next/link"
import { useCart } from "@/lib/shopify/cartContext"
import type { ShopifyProduct } from "@/lib/shopify/types"

interface Props {
  product: ShopifyProduct
  featured?: boolean
}

export function ProductCard({ product, featured = false }: Props) {
  const { addItem, isLoading } = useCart()
  const [adding, setAdding] = useState(false)

  const soldOut   = product.inventory === 0
  const lowStock  = product.inventory > 0 && product.inventory < 5
  const canQuickBuy = !!product.variantId && !soldOut

  const handleAddToCart = async () => {
    if (!product.variantId || soldOut) return
    setAdding(true)
    await addItem(product.variantId, 1)
    setAdding(false)
  }

  const busy = adding || isLoading

  return (
    <div className={`bg-black flex flex-col gap-4 group ${featured ? "p-0" : "p-6"}`}>
      {/* Image */}
      <div className={`relative bg-white/[0.02] flex items-center justify-center border border-white/5 overflow-hidden ${featured ? "aspect-[4/5]" : "aspect-square"}`}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <span className={`font-black text-white/[0.04] select-none leading-none ${featured ? "text-[10rem]" : "text-[6rem]"}`}>
            {product.title.charAt(0)}
          </span>
        )}

        {/* Inventory badge */}
        {soldOut && (
          <span className="absolute top-3 left-3 text-[8px] tracking-[0.25em] uppercase bg-black/80 text-white/40 px-2 py-1">
            Sold Out
          </span>
        )}
        {lowStock && (
          <span className="absolute top-3 left-3 text-[8px] tracking-[0.25em] uppercase bg-yellow-500/10 text-yellow-400/80 px-2 py-1">
            Only {product.inventory} left
          </span>
        )}

        {/* Quick-buy overlay on hover (featured cards) */}
        {featured && canQuickBuy && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 p-4">
            <button
              onClick={handleAddToCart}
              disabled={busy}
              className="w-full bg-white text-black text-[10px] tracking-[0.2em] uppercase py-3 hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {busy ? "Adding…" : "Quick Add"}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`flex-1 space-y-1 ${featured ? "px-4 pb-4" : ""}`}>
        <p className="text-[9px] tracking-[0.25em] uppercase text-white/25">
          {product.productType}{product.vendor ? ` · ${product.vendor}` : ""}
        </p>
        <Link
          href={`/shop/${product.handle}`}
          className={`block font-semibold text-white/80 hover:text-white transition-colors leading-snug ${featured ? "text-base" : "text-sm"}`}
        >
          {product.title}
        </Link>
        {product.description && (
          <p className="text-xs text-white/30 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        )}
      </div>

      {/* Price + CTA */}
      <div className={`flex items-center justify-between border-t border-white/5 pt-4 ${featured ? "px-4 pb-4" : ""}`}>
        <div>
          <p className={`font-black text-white ${featured ? "text-lg" : "text-base"}`}>
            ${product.price.toFixed(2)}
          </p>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <p className="text-[10px] text-white/25 line-through">${product.compareAtPrice.toFixed(2)}</p>
          )}
        </div>

        {canQuickBuy ? (
          <button
            onClick={handleAddToCart}
            disabled={busy}
            className="bg-white text-black text-[10px] tracking-[0.2em] uppercase px-5 py-2 hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add to Cart"}
          </button>
        ) : soldOut ? (
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/20 px-5 py-2 border border-white/5">
            Sold Out
          </span>
        ) : (
          <a
            href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/products/${product.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-black text-[10px] tracking-[0.2em] uppercase px-5 py-2 hover:bg-white/90 transition-colors"
          >
            Buy Now ↗
          </a>
        )}
      </div>
    </div>
  )
}
