"use client";

import Link from "next/link";
import { use } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useShopifyStore } from "@/lib/shopify/store";

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdminProductDetailPage({ params }: Props) {
  const { id } = use(params);
  const { products, inventory } = useShopifyStore();

  const product = products.find((p) => p.id === id);
  const invItem = inventory.find((i) => i.productId === id);

  if (!product) {
    return (
      <AdminShell title="Product">
        <div className="space-y-4">
          <Link href="/admin/products" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/60 transition-colors">
            ← Back to Products
          </Link>
          <p className="text-white/30 text-sm">Product not found.</p>
        </div>
      </AdminShell>
    );
  }

  const shopifyDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const shopifyAdminUrl =
    product.shopifyGid && shopifyDomain
      ? `https://${shopifyDomain}/admin/products/${product.shopifyGid.split("/").pop()}`
      : null;

  return (
    <AdminShell title={product.title}>
      <div className="space-y-8 max-w-3xl">
        {/* Back */}
        <Link href="/admin/products" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/60 transition-colors">
          ← Back to Products
        </Link>

        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white/80">{product.title}</h2>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">{product.vendor} — {product.productType}</p>
        </div>

        {/* Edit notice */}
        <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4 text-[11px] text-white/30 leading-relaxed">
          To edit this product, visit your Shopify admin dashboard. SUMG Admin tracks metadata and
          status — product edits are made in Shopify.
          {shopifyAdminUrl && (
            <>
              {" "}
              <a
                href={shopifyAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 hover:text-white underline underline-offset-2 transition-colors"
              >
                Open in Shopify →
              </a>
            </>
          )}
        </div>

        {/* Product fields */}
        <div className="border border-white/5 divide-y divide-white/[0.04]">
          {[
            { label: "Status",     value: product.status },
            { label: "Price",      value: `$${product.price.toFixed(2)} ${product.currency}` },
            { label: "Brand",      value: product.brandSlug },
            { label: "Handle",     value: product.handle },
            { label: "Collection", value: product.collectionHandle ?? "—" },
            { label: "Variants",   value: product.variantsCount },
            { label: "Last Synced", value: product.lastSynced ? product.lastSynced.slice(0, 16).replace("T", " ") : "Never" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-white/20 min-w-[120px]">{label}</span>
              <span className="text-[12px] text-white/55 font-mono">{String(value)}</span>
            </div>
          ))}
        </div>

        {/* Inventory tracker */}
        {invItem && (
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-3">Inventory</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Available", value: invItem.available, cls: invItem.available === 0 ? "text-red-400/80" : invItem.available < 5 ? "text-yellow-400/80" : "text-green-400/70" },
                { label: "Committed", value: invItem.committed, cls: "text-white/50" },
                { label: "Incoming",  value: invItem.incoming,  cls: "text-white/30" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="border border-white/5 p-4">
                  <p className={`text-2xl font-black mb-1 ${cls}`}>{value}</p>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-3">Tags</p>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="text-[10px] tracking-[0.1em] border border-white/10 px-2 py-1 text-white/30">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-3">Description</p>
            <p className="text-[13px] text-white/40 leading-relaxed">{product.description}</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
