import Link from "next/link"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Payment Integrations — SUMG Admin" }

interface IntegrationStatus {
  name: string
  connected: boolean
  detail: string
  envKeys?: string[]
  manageHref?: string
  manageLabel?: string
  internalHref?: string
  internalLabel?: string
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${ok ? "bg-emerald-500" : "bg-white/15"}`} />
}

function isSet(v: string | undefined) {
  return typeof v === "string" && v.trim().length > 0
}

export default async function PaymentsIntegrationsPage() {
  await requireAdmin()

  const shopifyConnected = isSet(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) && (
    isSet(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) || isSet(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN)
  )
  const stripeConnected = isSet(process.env.STRIPE_SECRET_KEY)
  const paypalConnected = isSet(process.env.PAYPAL_CLIENT_ID) && isSet(process.env.PAYPAL_CLIENT_SECRET)

  const integrations: IntegrationStatus[] = [
    {
      name: "Shopify",
      connected: shopifyConnected,
      detail: shopifyConnected
        ? `Storefront connected · ${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}. Products, orders, and checkout handled by Shopify.`
        : "Set NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN and a Storefront or Admin token.",
      envKeys: ["NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN", "NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN", "SHOPIFY_ADMIN_ACCESS_TOKEN"],
      manageHref: shopifyConnected ? `https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/admin` : "https://shopify.com",
      manageLabel: "Shopify Admin",
      internalHref: "/admin/storefront",
      internalLabel: "Open Storefront",
    },
    {
      name: "Stripe",
      connected: stripeConnected,
      detail: stripeConnected
        ? "Stripe API connected. Memberships and direct payments available."
        : "Set STRIPE_SECRET_KEY for memberships, subscriptions, and direct charges.",
      envKeys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      manageHref: "https://dashboard.stripe.com",
      manageLabel: "Stripe Dashboard",
    },
    {
      name: "PayPal",
      connected: paypalConnected,
      detail: paypalConnected
        ? "PayPal REST API configured. Optional checkout method for storefront."
        : "Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to add PayPal as a checkout option.",
      envKeys: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
      manageHref: "https://developer.paypal.com/dashboard",
      manageLabel: "PayPal Developer",
    },
    {
      name: "Bank / ACH",
      connected: false,
      detail: "Royalty payouts to artists currently handled manually via finance ledger.",
      internalHref: "/admin/finance",
      internalLabel: "Open Finance",
    },
  ]

  const connectedCount = integrations.filter((i) => i.connected).length

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / Integrations</p>
          <h1 className="text-3xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-2 text-sm text-white/40">
            {connectedCount} of {integrations.length} connected · Commerce, memberships, and royalty payouts.
          </p>
        </div>
        <Link href="/admin/settings" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">← Settings</Link>
      </div>

      <div className="space-y-3">
        {integrations.map((i) => (
          <div key={i.name} className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusDot ok={i.connected} />
                <h2 className="text-sm font-medium text-white/85">{i.name}</h2>
                <span className={`text-[9px] tracking-[0.15em] uppercase font-mono ${i.connected ? "text-emerald-400/70" : "text-white/25"}`}>
                  {i.connected ? "connected" : "not configured"}
                </span>
              </div>
              {i.manageHref && (
                <a
                  href={i.manageHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150"
                >
                  {i.manageLabel} →
                </a>
              )}
            </div>
            <div className="px-6 py-4">
              <p className="text-xs text-white/45 leading-relaxed mb-3">{i.detail}</p>
              {i.envKeys && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {i.envKeys.map((k) => (
                    <code key={k} className="text-[10px] font-mono text-white/40 bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5">
                      {k}
                    </code>
                  ))}
                </div>
              )}
              {i.internalHref && (
                <Link href={i.internalHref} className="text-xs text-violet-400/70 hover:text-violet-300 transition-colors duration-150">
                  {i.internalLabel} →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
