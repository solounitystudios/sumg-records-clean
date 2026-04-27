// Client-safe — uses NEXT_PUBLIC_ env vars only.

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              price { amount currencyCode }
              image { url altText }
              product { title handle }
            }
          }
          cost { totalAmount { amount currencyCode } }
        }
      }
    }
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount   { amount currencyCode }
    }
  }
`

export interface CartLine {
  id:            string
  quantity:      number
  variantId:     string
  variantTitle:  string
  productTitle:  string
  productHandle: string
  imageUrl?:     string
  price:         number
  lineTotal:     number
  currencyCode:  string
}

export interface Cart {
  id:           string
  checkoutUrl:  string
  lines:        CartLine[]
  subtotal:     number
  total:        number
  currencyCode: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCart(raw: any): Cart {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines: CartLine[] = raw.lines.edges.map(({ node }: any) => ({
    id:            node.id,
    quantity:      node.quantity,
    variantId:     node.merchandise.id,
    variantTitle:  node.merchandise.title,
    productTitle:  node.merchandise.product.title,
    productHandle: node.merchandise.product.handle,
    imageUrl:      node.merchandise.image?.url ?? undefined,
    price:         parseFloat(node.merchandise.price.amount),
    lineTotal:     parseFloat(node.cost.totalAmount.amount),
    currencyCode:  node.cost.totalAmount.currencyCode,
  }))
  return {
    id:           raw.id,
    checkoutUrl:  raw.checkoutUrl,
    lines,
    subtotal:     parseFloat(raw.cost.subtotalAmount.amount),
    total:        parseFloat(raw.cost.totalAmount.amount),
    currencyCode: raw.cost.totalAmount.currencyCode,
  }
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  const token  = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN
  if (!domain || !token) throw new Error("Shopify not configured")

  const res = await fetch(`https://${domain}/api/2024-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type":                      "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "Storefront API error")
  return json.data as T
}

export async function createCart(variantId: string, quantity: number): Promise<Cart> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await gql<any>(`
    mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines }) {
        cart { ...CartFields }
      }
    }
    ${CART_FRAGMENT}
  `, { lines: [{ merchandiseId: variantId, quantity }] })
  return normalizeCart(data.cartCreate.cart)
}

export async function addCartLines(cartId: string, variantId: string, quantity: number): Promise<Cart> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await gql<any>(`
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
      }
    }
    ${CART_FRAGMENT}
  `, { cartId, lines: [{ merchandiseId: variantId, quantity }] })
  return normalizeCart(data.cartLinesAdd.cart)
}

export async function updateCartLine(cartId: string, lineId: string, quantity: number): Promise<Cart> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await gql<any>(`
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
      }
    }
    ${CART_FRAGMENT}
  `, { cartId, lines: [{ id: lineId, quantity }] })
  return normalizeCart(data.cartLinesUpdate.cart)
}

export async function removeCartLines(cartId: string, lineIds: string[]): Promise<Cart> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await gql<any>(`
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
      }
    }
    ${CART_FRAGMENT}
  `, { cartId, lineIds })
  return normalizeCart(data.cartLinesRemove.cart)
}

export async function getCart(cartId: string): Promise<Cart | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await gql<any>(`
      query GetCart($cartId: ID!) {
        cart(id: $cartId) { ...CartFields }
      }
      ${CART_FRAGMENT}
    `, { cartId })
    return data.cart ? normalizeCart(data.cart) : null
  } catch {
    return null
  }
}
