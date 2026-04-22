"use client";

/**
 * Shopify Commerce Store
 *
 * Client-side React context for Shopify commerce data.
 * When NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN is configured, syncStatus.connected = true
 * and a server-side sync via /api/shopify/* can be wired up.
 * Until then, all data is served from fallback static data (manual entries).
 *
 * Live Shopify sync requires SHOPIFY_ADMIN_ACCESS_TOKEN (server-side secret).
 * Expose data via /api/shopify/* routes — never expose the admin token client-side.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type {
  ShopifyProduct,
  ShopifyCollection,
  ShopifyOrder,
  ShopifyInventoryItem,
  ShopifyCampaign,
  ShopifyOrderStatus,
  ShopifySyncStatus,
} from "./types";
import {
  fallbackProducts,
  fallbackCollections,
  fallbackOrders,
  fallbackInventory,
  fallbackCampaigns,
} from "./fallback";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function resolveShopifyDomain(): string | undefined {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  return domain && domain.length > 0 ? domain : undefined;
}

// ─── State shape ─────────────────────────────────────────────────────────────

interface ShopifyState {
  products: ShopifyProduct[];
  collections: ShopifyCollection[];
  orders: ShopifyOrder[];
  inventory: ShopifyInventoryItem[];
  campaigns: ShopifyCampaign[];
  syncStatus: ShopifySyncStatus;
  isLoading: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface ShopifyStoreContextValue extends ShopifyState {
  updateProduct: (id: string, data: Partial<ShopifyProduct>) => void;
  updateOrderStatus: (id: string, status: ShopifyOrderStatus) => void;
  updateInventory: (id: string, available: number) => void;
  addCampaign: (data: Omit<ShopifyCampaign, "id" | "createdAt" | "updatedAt">) => ShopifyCampaign;
  updateCampaign: (id: string, data: Partial<ShopifyCampaign>) => void;
  deleteCampaign: (id: string) => void;
  refreshFromShopify: () => Promise<void>;
}

const ShopifyStoreContext = createContext<ShopifyStoreContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ShopifyStoreProvider({ children }: { children: ReactNode }) {
  const shopDomain = resolveShopifyDomain();

  const initialSyncStatus: ShopifySyncStatus = {
    connected: !!shopDomain,
    shopDomain: shopDomain,
    productCount: fallbackProducts.length,
    orderCount: fallbackOrders.length,
  };

  const [products, setProducts] = useState<ShopifyProduct[]>(fallbackProducts);
  const [collections, setCollections] = useState<ShopifyCollection[]>(fallbackCollections);
  const [orders, setOrders] = useState<ShopifyOrder[]>(fallbackOrders);
  const [inventory, setInventory] = useState<ShopifyInventoryItem[]>(fallbackInventory);
  const [campaigns, setCampaigns] = useState<ShopifyCampaign[]>(fallbackCampaigns);
  const [syncStatus, setSyncStatus] = useState<ShopifySyncStatus>(initialSyncStatus);
  const [isLoading, setIsLoading] = useState(false);

  const updateProduct = useCallback((id: string, data: Partial<ShopifyProduct>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: now() } : p))
    );
  }, []);

  const updateOrderStatus = useCallback((id: string, status: ShopifyOrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status, updatedAt: now() } : o))
    );
  }, []);

  const updateInventory = useCallback((id: string, available: number) => {
    let productId: string | undefined;
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        productId = item.productId;
        return { ...item, available, updatedAt: now() };
      })
    );
    if (productId) {
      const pid = productId;
      setProducts((prev) =>
        prev.map((p) => (p.id === pid ? { ...p, inventory: available, updatedAt: now() } : p))
      );
    }
  }, []);

  const addCampaign = useCallback(
    (data: Omit<ShopifyCampaign, "id" | "createdAt" | "updatedAt">): ShopifyCampaign => {
      const campaign: ShopifyCampaign = {
        ...data,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      setCampaigns((prev) => [...prev, campaign]);
      return campaign;
    },
    []
  );

  const updateCampaign = useCallback((id: string, data: Partial<ShopifyCampaign>) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data, updatedAt: now() } : c))
    );
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /**
   * Sync from Shopify Admin API — NOT YET IMPLEMENTED.
   *
   * This function is a deliberate stub.  The admin pages show static fallback
   * data and a "Shopify not configured" banner when `connected` is false.
   *
   * To implement live sync:
   *   1. Create app/api/shopify/sync/route.ts (server-side, uses SHOPIFY_ADMIN_ACCESS_TOKEN)
   *   2. Fetch products, orders, and inventory via Shopify Admin REST or GraphQL API
   *   3. Persist results to the shopify_* Supabase tables
   *   4. Replace the console.info below with a fetch() to that route
   *
   * Required env vars (server-side only):
   *   NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN — storefront domain (e.g. mystore.myshopify.com)
   *   SHOPIFY_ADMIN_ACCESS_TOKEN       — Admin API access token (never expose in the browser)
   */
  const refreshFromShopify = useCallback(async () => {
    if (!shopDomain) {
      console.info(
        "[ShopifyStore] Shopify sync not yet implemented. " +
        "Set NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN to enable live sync."
      );
      setSyncStatus((prev) => ({
        ...prev,
        error: "Shopify not configured — set NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN to enable live sync.",
      }));
      return;
    }

    setIsLoading(true);
    try {
      // Stub — replace with fetch("/api/shopify/sync") once the server route is implemented.
      console.info("[ShopifyStore] refreshFromShopify() stub — Shopify Admin API integration pending.");
      setSyncStatus((prev) => ({ ...prev, lastSync: now(), error: undefined }));
    } finally {
      setIsLoading(false);
    }
  }, [shopDomain]);

  return (
    <ShopifyStoreContext.Provider
      value={{
        products,
        collections,
        orders,
        inventory,
        campaigns,
        syncStatus,
        isLoading,
        updateProduct,
        updateOrderStatus,
        updateInventory,
        addCampaign,
        updateCampaign,
        deleteCampaign,
        refreshFromShopify,
      }}
    >
      {children}
    </ShopifyStoreContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useShopifyStore(): ShopifyStoreContextValue {
  const ctx = useContext(ShopifyStoreContext);
  if (!ctx) {
    throw new Error("useShopifyStore must be used within a ShopifyStoreProvider");
  }
  return ctx;
}
