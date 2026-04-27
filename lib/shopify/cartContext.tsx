"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Cart } from "./cartApi"
import { createCart, addCartLines, updateCartLine, removeCartLines, getCart } from "./cartApi"

const CART_ID_KEY = "sumg_shopify_cart_id"

interface CartContextValue {
  cart:        Cart | null
  isOpen:      boolean
  isLoading:   boolean
  itemCount:   number
  openCart:    () => void
  closeCart:   () => void
  addItem:     (variantId: string, quantity?: number) => Promise<void>
  updateItem:  (lineId: string, quantity: number) => Promise<void>
  removeItem:  (lineId: string) => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart]           = useState<Cart | null>(null)
  const [isOpen, setIsOpen]       = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Restore persisted cart on mount
  useEffect(() => {
    const cartId = localStorage.getItem(CART_ID_KEY)
    if (!cartId) return
    getCart(cartId).then((c) => {
      if (c) setCart(c)
      else localStorage.removeItem(CART_ID_KEY)
    })
  }, [])

  const openCart  = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const addItem = useCallback(async (variantId: string, quantity = 1) => {
    setIsLoading(true)
    try {
      const cartId = localStorage.getItem(CART_ID_KEY)
      let updated: Cart
      if (cartId) {
        updated = await addCartLines(cartId, variantId, quantity)
      } else {
        updated = await createCart(variantId, quantity)
        localStorage.setItem(CART_ID_KEY, updated.id)
      }
      setCart(updated)
      setIsOpen(true)
    } catch (err) {
      console.error("[cart] addItem failed:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateItem = useCallback(async (lineId: string, quantity: number) => {
    if (!cart) return
    setIsLoading(true)
    try {
      setCart(await updateCartLine(cart.id, lineId, quantity))
    } catch (err) {
      console.error("[cart] updateItem failed:", err)
    } finally {
      setIsLoading(false)
    }
  }, [cart])

  const removeItem = useCallback(async (lineId: string) => {
    if (!cart) return
    setIsLoading(true)
    try {
      setCart(await removeCartLines(cart.id, [lineId]))
    } catch (err) {
      console.error("[cart] removeItem failed:", err)
    } finally {
      setIsLoading(false)
    }
  }, [cart])

  const itemCount = cart?.lines.reduce((s, l) => s + l.quantity, 0) ?? 0

  return (
    <CartContext.Provider value={{ cart, isOpen, isLoading, itemCount, openCart, closeCart, addItem, updateItem, removeItem }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
