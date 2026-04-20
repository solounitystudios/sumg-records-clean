"use client";
import { CmsStoreProvider } from "@/lib/cms/store";
import { ShopifyStoreProvider } from "@/lib/shopify/store";

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <CmsStoreProvider>
      <ShopifyStoreProvider>{children}</ShopifyStoreProvider>
    </CmsStoreProvider>
  );
}
