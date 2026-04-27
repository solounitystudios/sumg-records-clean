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
          images(first: 1) {
            edges { node { url } }
          }
          totalInventory
          variants(first: 1) {
            edges { node { id } }
          }
          createdAt
          updatedAt
        }
      }
    }
  }
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProduct(node: any): ShopifyProduct {
  const price = parseFloat(node.priceRange?.minVariantPrice?.amount ?? "0")
  const compareRaw = node.compareAtPriceRange?.minVariantPrice?.amount
  const compareAtPrice = compareRaw ? parseFloat(compareRaw) : undefined
  const currency: string = node.priceRange?.minVariantPrice?.currencyCode ?? "USD"
  const imageUrl: string | undefined = node.images?.edges?.[0]?.node?.url ?? undefined
  const rawStatus: string = (node.status as string).toLowerCase()
  const status = (["active", "archived", "draft"].includes(rawStatus)
    ? rawStatus
    : "draft") as ShopifyProductStatus
  const brandSlug = (node.vendor as string).toLowerCase().replace(/\s+/g, "-")

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
    inventory:      node.totalInventory ?? 0,
    variantsCount:  node.variants?.edges?.length ?? 0,
    variantId:      node.variants?.edges?.[0]?.node?.id ?? undefined,
    brandSlug,
    shopifyGid:     node.id,
    lastSynced:     new Date().toISOString(),
    createdAt:      node.createdAt,
    updatedAt:      node.updatedAt,
  }
}

async function fetchStorefrontProducts(): Promise<ShopifyProduct[]> {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  const token  = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN

  if (!domain || !token) return fallbackProducts

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
      console.error(`[shopify] storefront API error: ${res.status}`)
      return fallbackProducts
    }

    const json = await res.json()
    if (json.errors?.length) {
      console.error("[shopify] GraphQL errors:", json.errors)
      return fallbackProducts
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edges: any[] = json.data?.products?.edges ?? []
    return edges.map((e: { node: unknown }) => normalizeProduct(e.node))
  } catch (err) {
    console.error("[shopify] fetch failed:", err)
    return fallbackProducts
  }
}

export async function getPublicProducts(): Promise<ShopifyProduct[]> {
  const products = await fetchStorefrontProducts()
  return products.filter((p) => p.status === "active")
}

export async function getProductsByBrand(brandSlug: string): Promise<ShopifyProduct[]> {
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
