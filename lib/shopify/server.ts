import type { ShopifyProduct, ShopifyProductStatus } from "./types";
import { fallbackProducts } from "./fallback";

const STOREFRONT_API_VERSION = "2024-01"

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          handle
          title
          vendor
          productType
          status
          description
          tags
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          compareAtPriceRange {
            minVariantPrice { amount }
          }
          images(first: 4) {
            edges { node { url altText } }
          }
          totalInventory
          variants(first: 10) {
            edges { node { id title availableForSale price { amount currencyCode } } }
          }
          createdAt
          updatedAt
        }
      }
    }
  }
`

export interface ShopifyVariant {
  id: string
  title: string
  available: boolean
  price: number
  currency: string
}

export interface ShopifyProductDetail extends ShopifyProduct {
  images: string[]
  variants: ShopifyVariant[]
  usingFallback: boolean
}

function normalizeProduct(node: any): ShopifyProductDetail {
  const price = parseFloat(node.priceRange?.minVariantPrice?.amount ?? "0")
  const compareRaw = node.compareAtPriceRange?.minVariantPrice?.amount
  const compareAtPrice = compareRaw ? parseFloat(compareRaw) : undefined
  const currency: string = node.priceRange?.minVariantPrice?.currencyCode ?? "USD"
  const images: string[] = (node.images?.edges ?? []).map((e: any) => e.node.url as string)
  const imageUrl = images[0]
  const rawStatus: string = (node.status as string).toLowerCase()
  const status = (["active", "archived", "draft"].includes(rawStatus)
    ? rawStatus
    : "draft") as ShopifyProductStatus
  const brandSlug = (node.vendor as string).toLowerCase().replace(/\s+/g, "-")
  const variants: ShopifyVariant[] = (node.variants?.edges ?? []).map((e: any) => ({
    id: e.node.id as string,
    title: e.node.title as string,
    available: e.node.availableForSale as boolean,
    price: parseFloat(e.node.price?.amount ?? "0"),
    currency: e.node.price?.currencyCode ?? "USD",
  }))

  return {
    id:             node.id,
    handle:         node.handle,
    title:          node.title,
    vendor:         node.vendor,
    productType:    node.productType ?? "",
    status,
    description:    node.description ?? undefined,
    tags:           node.tags ?? [],
    price,
    compareAtPrice,
    currency,
    imageUrl,
    images,
    variants,
    inventory:      node.totalInventory ?? 0,
    variantsCount:  variants.length,
    variantId:      variants[0]?.id,
    brandSlug,
    shopifyGid:     node.id,
    lastSynced:     new Date().toISOString(),
    createdAt:      node.createdAt,
    updatedAt:      node.updatedAt,
    usingFallback:  false,
  }
}

let _storefrontWarned = false

async function fetchStorefrontProducts(): Promise<{ products: ShopifyProductDetail[]; usingFallback: boolean }> {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  const token  = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN

  const hasDomain = !!domain
  const hasToken  = !!token

  if (!hasDomain || !hasToken) {
    if (!_storefrontWarned) {
      console.warn(
        `[shopify] Storefront API not configured — domain:${hasDomain} token:${hasToken}. Using fallback products.`
      )
      _storefrontWarned = true
    }
    return { products: fallbackProducts.map(toDetail), usingFallback: true }
  }

  const url = `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":                      "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { first: 250 } }),
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      console.warn(
        `[shopify] Storefront API ${res.status} — domain:${hasDomain} token:${hasToken}. Verify the Storefront Access Token in Shopify admin → Sales Channels → Headless. Falling back.`
      )
      return { products: fallbackProducts.map(toDetail), usingFallback: true }
    }

    const json = await res.json()
    if (json.errors?.length) {
      console.warn("[shopify] GraphQL errors:", json.errors)
      return { products: fallbackProducts.map(toDetail), usingFallback: true }
    }

    const edges: any[] = json.data?.products?.edges ?? []
    return { products: edges.map((e: { node: unknown }) => normalizeProduct(e.node)), usingFallback: false }
  } catch (err) {
    console.warn("[shopify] fetch failed:", err)
    return { products: fallbackProducts.map(toDetail), usingFallback: true }
  }
}

function toDetail(p: ShopifyProduct): ShopifyProductDetail {
  return {
    ...p,
    images:       p.imageUrl ? [p.imageUrl] : [],
    variants:     p.variantId
      ? [{ id: p.variantId, title: "Default", available: p.inventory > 0, price: p.price, currency: p.currency }]
      : [],
    usingFallback: true,
  }
}

export async function getPublicProducts(): Promise<ShopifyProductDetail[]> {
  const { products } = await fetchStorefrontProducts()
  return products.filter((p) => p.status === "active")
}

export async function getProductByHandle(handle: string): Promise<ShopifyProductDetail | null> {
  const { products, usingFallback } = await fetchStorefrontProducts()
  const product = products.find((p) => p.handle === handle) ?? null
  if (product) product.usingFallback = usingFallback
  return product
}

export async function getShopifyStatus(): Promise<{ connected: boolean; usingFallback: boolean; domain: string | null; hasDomain: boolean; hasToken: boolean }> {
  const domain   = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ?? null
  const hasDomain = !!domain
  const hasToken  = !!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN

  if (!hasDomain || !hasToken) {
    return { connected: false, usingFallback: true, domain, hasDomain, hasToken }
  }

  const { usingFallback } = await fetchStorefrontProducts()
  return { connected: !usingFallback, usingFallback, domain, hasDomain, hasToken }
}

export async function getProductsByBrand(brandSlug: string): Promise<ShopifyProductDetail[]> {
  const products = await getPublicProducts()
  return products.filter((p) => p.brandSlug === brandSlug)
}

export function getProductBuyUrl(product: ShopifyProduct): string {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  if (domain && domain.length > 0) {
    return `https://${domain}/products/${product.handle}`
  }
  return `/contact?subject=${encodeURIComponent(`Product Inquiry: ${product.title}`)}`
}
