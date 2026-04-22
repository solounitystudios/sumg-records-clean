// lib/shopify/fallback.ts
import type { ShopifyProduct, ShopifyCollection, ShopifyOrder, ShopifyInventoryItem, ShopifyCampaign } from "./types";

export const fallbackProducts: ShopifyProduct[] = [
  // Woronoff
  { id: "prod-wo-1", handle: "woronoff-void-jacket", title: "Void Series — Jacket", vendor: "Woronoff", productType: "Outerwear", status: "active", price: 340, currency: "USD", inventory: 12, variantsCount: 3, brandSlug: "woronoff", tags: ["outerwear", "void-series"], description: "Architectural construction, severe in finish. Limited edition.", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "prod-wo-2", handle: "woronoff-silence-tee", title: "Silence Tee", vendor: "Woronoff", productType: "Tops", status: "active", price: 95, currency: "USD", inventory: 28, variantsCount: 4, brandSlug: "woronoff", tags: ["tops", "core"], description: "Wear the silence.", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  // Unity Standard
  { id: "prod-us-1", handle: "unity-standard-margin-cap", title: "Margin Cap", vendor: "Unity Standard", productType: "Accessories", status: "active", price: 55, currency: "USD", inventory: 40, variantsCount: 1, brandSlug: "unity-standard", tags: ["accessories", "core"], description: "Built in the dark.", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "prod-us-2", handle: "unity-standard-tech-fleece", title: "Technical Fleece", vendor: "Unity Standard", productType: "Tops", status: "draft", price: 180, currency: "USD", inventory: 0, variantsCount: 2, brandSlug: "unity-standard", tags: ["tops", "technical"], description: "Minimal. Technical. Uncompromising.", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  // Moon Spell
  { id: "prod-ms-1", handle: "moon-spell-ritual-candle", title: "Ritual Candle — Noir", vendor: "Moon Spell", productType: "Wellness", status: "active", price: 45, currency: "USD", inventory: 60, variantsCount: 1, brandSlug: "moon-spell", tags: ["wellness", "sensory"], description: "Sound environments for altered states.", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  // Concrete Borough
  { id: "prod-cb-1", handle: "concrete-borough-zine-vol1", title: "Visual Zine Vol. 1", vendor: "Concrete Borough", productType: "Editorial", status: "active", price: 28, currency: "USD", inventory: 75, variantsCount: 1, brandSlug: "concrete-borough", tags: ["editorial", "print"], description: "Frame the underground.", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  // Salt Current
  { id: "prod-sc-1", handle: "salt-current-essay-collection", title: "Essay Collection — Vol. 1", vendor: "Salt Current", productType: "Books", status: "active", price: 22, currency: "USD", inventory: 100, variantsCount: 1, brandSlug: "salt-current", tags: ["books", "editorial"], description: "The unwritten record.", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
];

export const fallbackCollections: ShopifyCollection[] = [
  { id: "col-wo-1", handle: "woronoff-void-series", title: "Void Series", brandSlug: "woronoff", description: "Spring 2025 capsule. Architectural. Severe.", productsCount: 2, published: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "col-us-1", handle: "unity-standard-core", title: "Core Collection", brandSlug: "unity-standard", description: "The fundamentals. Built to last.", productsCount: 2, published: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "col-ms-1", handle: "moon-spell-sensory", title: "Sensory Series", brandSlug: "moon-spell", description: "Sound, scent, and altered states.", productsCount: 1, published: true, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
];

export const fallbackOrders: ShopifyOrder[] = [
  { id: "ord-1", orderNumber: 1001, status: "fulfilled", financialStatus: "paid", fulfillmentStatus: "fulfilled", totalPrice: 435, currency: "USD", customerName: "Alex K.", lineItems: [{ id: "li-1", productId: "prod-wo-1", productTitle: "Void Series — Jacket", quantity: 1, price: 340 }, { id: "li-2", productId: "prod-wo-2", productTitle: "Silence Tee", quantity: 1, price: 95 }], brandSlug: "woronoff", createdAt: "2025-03-15T00:00:00Z", updatedAt: "2025-03-15T00:00:00Z" },
  { id: "ord-2", orderNumber: 1002, status: "processing", financialStatus: "paid", fulfillmentStatus: "unfulfilled", totalPrice: 55, currency: "USD", customerName: "Jordan M.", lineItems: [{ id: "li-3", productId: "prod-us-1", productTitle: "Margin Cap", quantity: 1, price: 55 }], brandSlug: "unity-standard", createdAt: "2025-04-01T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z" },
  { id: "ord-3", orderNumber: 1003, status: "pending", financialStatus: "pending", fulfillmentStatus: "unfulfilled", totalPrice: 45, currency: "USD", customerName: "Sam T.", lineItems: [{ id: "li-4", productId: "prod-ms-1", productTitle: "Ritual Candle — Noir", quantity: 1, price: 45 }], brandSlug: "moon-spell", createdAt: "2025-04-10T00:00:00Z", updatedAt: "2025-04-10T00:00:00Z" },
];

export const fallbackInventory: ShopifyInventoryItem[] = fallbackProducts.map(p => ({
  id: `inv-${p.id}`,
  productId: p.id,
  productTitle: p.title,
  available: p.inventory,
  committed: Math.floor(p.inventory * 0.1),
  incoming: 0,
  brandSlug: p.brandSlug,
  updatedAt: p.updatedAt,
}));

export const fallbackCampaigns: ShopifyCampaign[] = [
  { id: "camp-1", name: "Void Series Launch", brandSlug: "woronoff", status: "active", startDate: "2025-03-01", description: "Spring 2025 capsule launch across all channels.", featuredProductIds: ["prod-wo-1", "prod-wo-2"], createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-02-01T00:00:00Z" },
  { id: "camp-2", name: "Core Drop — Unity Standard", brandSlug: "unity-standard", status: "draft", description: "Core accessories campaign.", featuredProductIds: ["prod-us-1"], createdAt: "2025-03-01T00:00:00Z", updatedAt: "2025-03-01T00:00:00Z" },
];
