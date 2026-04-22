// lib/shopify/types.ts

export type ShopifyProductStatus = "active" | "archived" | "draft";
export type ShopifyOrderStatus = "pending" | "processing" | "fulfilled" | "cancelled" | "refunded";
export type ShopifyFinancialStatus = "pending" | "paid" | "refunded" | "partially_refunded";
export type ShopifyFulfillmentStatus = "unfulfilled" | "partial" | "fulfilled";
export type CampaignStatus = "draft" | "active" | "scheduled" | "ended";

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  status: ShopifyProductStatus;
  description?: string;
  tags?: string[];
  price: number;
  compareAtPrice?: number;
  currency: string;
  imageUrl?: string;
  inventory: number;
  variantsCount: number;
  brandSlug: string;
  collectionHandle?: string;
  /** Shopify GID — populated when live-synced via Shopify API */
  shopifyGid?: string;
  /** ISO timestamp of last Shopify sync */
  lastSynced?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  brandSlug: string;
  description?: string;
  imageUrl?: string;
  productsCount: number;
  published: boolean;
  shopifyGid?: string;
  lastSynced?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyOrderLineItem {
  id: string;
  productId: string;
  productTitle: string;
  variantTitle?: string;
  quantity: number;
  price: number;
}

export interface ShopifyOrder {
  id: string;
  orderNumber: number;
  status: ShopifyOrderStatus;
  financialStatus: ShopifyFinancialStatus;
  fulfillmentStatus: ShopifyFulfillmentStatus;
  totalPrice: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  lineItems: ShopifyOrderLineItem[];
  brandSlug?: string;
  shopifyGid?: string;
  lastSynced?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyInventoryItem {
  id: string;
  productId: string;
  productTitle: string;
  variantTitle?: string;
  sku?: string;
  available: number;
  committed: number;
  incoming: number;
  brandSlug: string;
  shopifyGid?: string;
  updatedAt: string;
}

export interface ShopifyCampaign {
  id: string;
  name: string;
  brandSlug: string;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  description?: string;
  featuredProductIds: string[];
  goal?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifySyncStatus {
  connected: boolean;
  shopDomain?: string;
  lastSync?: string;
  productCount?: number;
  orderCount?: number;
  error?: string;
}
