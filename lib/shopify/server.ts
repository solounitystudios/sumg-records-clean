/**
 * lib/shopify/server.ts
 *
 * Server-side helpers for Shopify product data.
 * Safe to import in any Server Component or Server Action — no "use client".
 *
 * Currently returns active fallback products from lib/shopify/fallback.ts.
 * When live Shopify sync is configured (NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN +
 * SHOPIFY_ADMIN_ACCESS_TOKEN), extend getPublicProducts() to query the
 * shopify_products Supabase table populated by the sync route.
 */

import type { ShopifyProduct } from "./types";
import { fallbackProducts } from "./fallback";

export async function getPublicProducts(): Promise<ShopifyProduct[]> {
  return fallbackProducts.filter((p) => p.status === "active");
}

export async function getProductsByBrand(
  brandSlug: string
): Promise<ShopifyProduct[]> {
  const products = await getPublicProducts();
  return products.filter((p) => p.brandSlug === brandSlug);
}

/**
 * Returns a buy URL for a product.
 * - If NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN is set: Shopify storefront product URL.
 * - Otherwise: /contact inquiry page with the product name pre-filled.
 */
export function getProductBuyUrl(product: ShopifyProduct): string {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  if (domain && domain.length > 0) {
    return `https://${domain}/products/${product.handle}`;
  }
  return `/contact?subject=${encodeURIComponent(
    `Product Inquiry: ${product.title}`
  )}`;
}
