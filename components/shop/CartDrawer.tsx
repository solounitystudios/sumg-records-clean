"use client"

import { useEffect } from "react"
import { useCart } from "@/lib/shopify/cartContext"

export function CartDrawer() {
  const { cart, isOpen, isLoading, closeCart, updateItem, removeItem } = useCart()

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeCart() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, closeCart])

  const lines    = cart?.lines ?? []
  const subtotal = cart?.subtotal ?? 0
  const currency = cart?.currencyCode ?? "USD"
  const fmt      = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closeCart}
        aria-hidden
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-[#0a0a0a] border-l border-white/8 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/25 mb-0.5">Your</p>
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Cart {lines.length > 0 && <span className="text-white/35 font-normal">({lines.reduce((s,l)=>s+l.quantity,0)})</span>}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="text-white/30 hover:text-white transition-colors p-2 -mr-2"
            aria-label="Close cart"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto py-4">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <p className="text-white/20 text-xs tracking-[0.2em] uppercase">Your cart is empty</p>
              <button onClick={closeCart} className="text-[10px] tracking-[0.2em] uppercase text-white/30 hover:text-white border-b border-white/10 hover:border-white/40 transition-all pb-px">
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-4 px-6 py-5">
                  {/* Image */}
                  <div className="w-16 h-16 flex-shrink-0 bg-white/[0.03] border border-white/5 overflow-hidden">
                    {line.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.imageUrl} alt={line.productTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-2xl font-black">
                        {line.productTitle.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 leading-snug truncate">{line.productTitle}</p>
                    {line.variantTitle !== "Default Title" && (
                      <p className="text-[10px] text-white/30 mt-0.5">{line.variantTitle}</p>
                    )}
                    <p className="text-xs font-semibold text-white mt-1">{fmt(line.price)}</p>

                    {/* Quantity + remove */}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border border-white/10">
                        <button
                          onClick={() => line.quantity > 1 ? updateItem(line.id, line.quantity - 1) : removeItem(line.id)}
                          disabled={isLoading}
                          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs text-white/60">{line.quantity}</span>
                        <button
                          onClick={() => updateItem(line.id, line.quantity + 1)}
                          disabled={isLoading}
                          className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(line.id)}
                        disabled={isLoading}
                        className="text-[9px] tracking-[0.2em] uppercase text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Line total */}
                  <p className="text-xs font-semibold text-white/60 flex-shrink-0">{fmt(line.lineTotal)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && (
          <div className="border-t border-white/5 px-6 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Subtotal</p>
              <p className="text-sm font-semibold text-white">{fmt(subtotal)}</p>
            </div>
            <p className="text-[9px] text-white/20 leading-relaxed">
              Shipping and taxes calculated at checkout.
            </p>
            <a
              href={cart?.checkoutUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white text-black text-[11px] tracking-[0.25em] uppercase font-semibold text-center py-4 hover:bg-white/90 transition-colors"
            >
              Checkout →
            </a>
            <button
              onClick={closeCart}
              className="block w-full text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors text-center py-1"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
