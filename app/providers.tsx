"use client"

import { CartProvider } from "@/lib/shopify/cartContext"
import { CartDrawer } from "@/components/shop/CartDrawer"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  )
}
