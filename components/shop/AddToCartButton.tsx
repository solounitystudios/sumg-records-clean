"use client"

import { useState } from "react"
import { useCart } from "@/lib/shopify/cartContext"
import type { ShopifyVariant } from "@/lib/shopify/server"

interface Props {
  variants: ShopifyVariant[]
  soldOut: boolean
  externalUrl: string
}

export function AddToCartButton({ variants, soldOut, externalUrl }: Props) {
  const { addItem, isLoading } = useCart()
  const [selectedId, setSelectedId] = useState<string>(variants[0]?.id ?? "")
  const [adding, setAdding] = useState(false)

  const hasVariantChoice = variants.length > 1
  const selectedVariant = variants.find((v) => v.id === selectedId) ?? variants[0]
  const canAdd = !!selectedVariant?.id && selectedVariant.available && !soldOut

  const handleAdd = async () => {
    if (!canAdd) return
    setAdding(true)
    await addItem(selectedVariant!.id, 1)
    setAdding(false)
  }

  const busy = adding || isLoading

  if (soldOut) {
    return (
      <div className="space-y-3">
        <span className="block w-full text-center text-[11px] tracking-[0.2em] uppercase px-6 py-4 border border-white/10 text-white/25">
          Sold Out
        </span>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-[11px] tracking-[0.2em] uppercase px-6 py-4 border border-white/10 text-white/30 hover:text-white hover:border-white/30 transition"
        >
          View on Shopify ↗
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {hasVariantChoice && (
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2">Option</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                disabled={!v.available}
                className={`px-4 py-2 text-xs border transition-colors ${
                  v.id === selectedId
                    ? "border-white/50 text-white bg-white/5"
                    : "border-white/15 text-white/40 hover:border-white/30"
                } ${!v.available ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                {v.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={busy || !canAdd}
        className="w-full bg-white text-black text-[11px] tracking-[0.25em] uppercase px-6 py-4 font-semibold hover:bg-white/90 transition-colors disabled:opacity-40"
      >
        {busy ? "Adding…" : "Add to Cart"}
      </button>

      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition"
      >
        View on Shopify ↗
      </a>
    </div>
  )
}
