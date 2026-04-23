import Link from "next/link"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Settings — SUMG Admin" }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isConfigured(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
        ok ? "bg-emerald-500" : "bg-white/15"
      }`}
    />
  )
}

function StatusRow({
  label,
  ok,
  detail,
  actionLabel,
  actionHref,
}: {
  label: string
  ok: boolean
  detail: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-white/[0.05] last:border-0">
      <div className="flex items-start gap-3">
        <StatusDot ok={ok} />
        <div>
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{detail}</p>
        </div>
      </div>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150 shrink-0"
        >
          {actionLabel} →
        </a>
      )}
    </div>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-4 border-b border-white/[0.06]">
      <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">{children}</h2>
    </div>
  )
}

// ─── Role table ───────────────────────────────────────────────────────────────

const ROLES = [
  { role: "owner",           tier: "Executive",  desc: "Full label access. All admin, CMS, financial, and roster controls." },
  { role: "co_owner",        tier: "Executive",  desc: "Same as owner. Shared label ownership access." },
  { role: "admin",           tier: "Executive",  desc: "Full admin. Legacy role kept for backward compatibility." },
  { role: "editor",          tier: "CMS",        desc: "CMS access: create and edit artists, releases, news, lyrics." },
  { role: "media_manager",   tier: "CMS",        desc: "Media and asset management. Upload photos and files." },
  { role: "release_manager", tier: "CMS",        desc: "Release pipeline management. Manage release status and delivery." },
  { role: "artist",          tier: "Portal",     desc: "Artist portal only. Read-only access to own royalties and releases." },
] as const

const TIER_COLORS: Record<string, string> = {
  Executive: "bg-amber-500/10 text-amber-400/80 border-amber-500/20",
  CMS:       "bg-sky-500/10 text-sky-400/80 border-sky-500/20",
  Portal:    "bg-violet-500/10 text-violet-400/80 border-violet-500/20",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  const user = await requireAdmin()

  // ── Integration status (server-side env check) ───────────────────────
  const integrations = {
    supabaseUrl:     isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseKey:     isConfigured(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    supabaseService: isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY),
    spotifyId:       isConfigured(process.env.SPOTIFY_CLIENT_ID),
    spotifySecret:   isConfigured(process.env.SPOTIFY_CLIENT_SECRET),
    shopifyDomain:   isConfigured(process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN),
    shopifyToken:    isConfigured(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
    siteUrl:         isConfigured(process.env.NEXT_PUBLIC_SITE_URL),
  }

  const supabaseConnected = integrations.supabaseUrl && integrations.supabaseKey
  const spotifyConnected  = integrations.spotifyId && integrations.spotifySecret
  const shopifyConnected  = integrations.shopifyDomain && integrations.shopifyToken
  const siteUrl           = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sumgrecords.com"

  const currentRole = ROLES.find((r) => r.role === user.role)

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-white/50">
          Account, platform, and integration configuration.
        </p>
      </div>

      {/* ── Account & Role ── */}
      <section className="mb-6">
        <SectionCard>
          <SectionTitle>Account &amp; Role</SectionTitle>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              <span className="text-white/35">Email</span>
              <span className="text-white/80 font-mono text-xs break-all">{user.email ?? "—"}</span>

              <span className="text-white/35">User ID</span>
              <span className="text-white/50 font-mono text-xs break-all">{user.id}</span>

              <span className="text-white/35">Role</span>
              <div className="flex items-center gap-2">
                <span className="text-white/80 font-medium">{user.role || "none"}</span>
                {currentRole && (
                  <span
                    className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full border ${TIER_COLORS[currentRole.tier]}`}
                  >
                    {currentRole.tier}
                  </span>
                )}
              </div>

              {user.artistSlug && (
                <>
                  <span className="text-white/35">Artist Slug</span>
                  <span className="text-white/60 font-mono text-xs">{user.artistSlug}</span>
                </>
              )}
            </div>

            {currentRole && (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="text-xs text-white/45 leading-relaxed">{currentRole.desc}</p>
              </div>
            )}
          </div>
        </SectionCard>
      </section>

      {/* ── Label Information ── */}
      <section className="mb-6">
        <SectionCard>
          <SectionTitle>Label Information</SectionTitle>
          <div className="px-6 py-5">
            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              <span className="text-white/35">Label Name</span>
              <span className="text-white/80">SUMG Records</span>

              <span className="text-white/35">Site URL</span>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white/90 text-xs font-mono transition-colors duration-150"
              >
                {siteUrl}
              </a>

              <span className="text-white/35">Homepage</span>
              <Link
                href="/admin/cms/homepage"
                className="text-white/40 hover:text-white/70 text-xs transition-colors duration-150"
              >
                Edit hero copy &amp; featured content →
              </Link>

              <span className="text-white/35">CMS</span>
              <Link
                href="/admin/cms"
                className="text-white/40 hover:text-white/70 text-xs transition-colors duration-150"
              >
                Open CMS control center →
              </Link>
            </div>
          </div>
        </SectionCard>
      </section>

      {/* ── Integration Status ── */}
      <section className="mb-6">
        <SectionCard>
          <SectionTitle>Integration Status</SectionTitle>
          <div className="px-6">
            <StatusRow
              label="Supabase"
              ok={supabaseConnected}
              detail={
                supabaseConnected
                  ? `Connected · ${integrations.supabaseService ? "Service role configured" : "Service role not set — some admin writes may fail"}`
                  : "Not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
              }
              actionLabel="Dashboard"
              actionHref="https://supabase.com/dashboard"
            />
            <StatusRow
              label="Spotify API"
              ok={spotifyConnected}
              detail={
                spotifyConnected
                  ? "Configured · Client Credentials flow active. Artist data and top tracks available."
                  : "Not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to enable artist metrics."
              }
              actionLabel="Developer Console"
              actionHref="https://developer.spotify.com/dashboard"
            />
            <StatusRow
              label="Shopify"
              ok={shopifyConnected}
              detail={
                shopifyConnected
                  ? `Connected · Store: ${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}`
                  : "Not configured. Set NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN."
              }
              actionLabel="Admin"
              actionHref={shopifyConnected ? `https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/admin` : "https://shopify.com"}
            />
            <StatusRow
              label="Analytics"
              ok={false}
              detail="Not configured. Add Plausible, Fathom, or GA4 for web traffic data."
            />
            <StatusRow
              label="YouTube Data API"
              ok={false}
              detail="Not configured. Requires YouTube Data API v3 key for channel and video metrics."
            />
            <StatusRow
              label="Publishing / PRO"
              ok={false}
              detail="BMI and ASCAP have no public real-time API. Rights data is managed manually via Lyric Engine."
            />
          </div>
        </SectionCard>
      </section>

      {/* ── Branding ── */}
      <section className="mb-6">
        <SectionCard>
          <SectionTitle>Branding</SectionTitle>
          <div className="px-6 py-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Artists",   href: "/admin/artists",   desc: "Roster photos, bios, genre" },
                { label: "Releases",  href: "/admin/releases",  desc: "Cover art, accent colors, tracklist" },
                { label: "Brands",    href: "/admin/brands",    desc: "Brand identity, manifesto, logos" },
                { label: "Homepage",  href: "/admin/cms/homepage", desc: "Hero copy, featured sections" },
              ].map(({ label, href, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] hover:border-white/[0.12] transition-colors duration-150"
                >
                  <div>
                    <p className="text-sm font-medium text-white/70">{label}</p>
                    <p className="text-xs text-white/30 mt-0.5">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </SectionCard>
      </section>

      {/* ── Access & Roles ── */}
      <section className="mb-6">
        <SectionCard>
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Access &amp; Roles</h2>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/25 hover:text-white/50 transition-colors duration-150"
            >
              Manage Users →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-white/25 font-normal">Role</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-white/25 font-normal">Tier</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-white/25 font-normal">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {ROLES.map((r) => (
                  <tr
                    key={r.role}
                    className={r.role === user.role ? "bg-white/[0.03]" : ""}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white/60">{r.role}</span>
                        {r.role === user.role && (
                          <span className="text-[9px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded-full">
                            you
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full border ${TIER_COLORS[r.tier]}`}
                      >
                        {r.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/40 max-w-xs leading-relaxed">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-white/[0.06] bg-white/[0.01]">
            <p className="text-xs text-white/25">
              Roles are set in Supabase Auth under{" "}
              <code className="font-mono text-white/35">app_metadata.role</code>.
              User provisioning must be done from the Supabase dashboard.
            </p>
          </div>
        </SectionCard>
      </section>

      {/* ── Security ── */}
      <section className="mb-6">
        <SectionCard>
          <SectionTitle>Security</SectionTitle>
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              <span className="text-white/35">Auth provider</span>
              <span className="text-white/70">Supabase Auth · Email / Password</span>

              <span className="text-white/35">Route guard</span>
              <span className="text-white/70">
                <code className="font-mono text-xs text-white/50">proxy.ts</code>
                {" "}middleware + layout{" "}
                <code className="font-mono text-xs text-white/50">requireAdmin()</code>
              </span>

              <span className="text-white/35">Admin routes</span>
              <span className="text-white/70">
                Restricted to{" "}
                <code className="font-mono text-xs text-white/50">owner</code>,{" "}
                <code className="font-mono text-xs text-white/50">co_owner</code>,{" "}
                <code className="font-mono text-xs text-white/50">admin</code>
              </span>

              <span className="text-white/35">Session</span>
              <span className="text-white/70">JWT · Managed by Supabase Auth</span>
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <p className="text-xs text-white/30 mb-3">
                Signing out clears the Supabase session and redirects to login.
              </p>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="rounded-full border border-red-500/20 bg-red-500/5 px-5 py-2 text-xs text-red-400/70 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors duration-150 cursor-pointer"
                >
                  Sign Out of Admin
                </button>
              </form>
            </div>
          </div>
        </SectionCard>
      </section>

      {/* ── Environment ── */}
      <section className="mb-6">
        <SectionCard>
          <SectionTitle>Environment Variables</SectionTitle>
          <div className="px-6 py-1">
            {[
              { key: "NEXT_PUBLIC_SUPABASE_URL",            ok: integrations.supabaseUrl,    note: "Supabase project URL" },
              { key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",ok: integrations.supabaseKey,    note: "Supabase anon key" },
              { key: "SUPABASE_SERVICE_ROLE_KEY",           ok: integrations.supabaseService,note: "Supabase service role (server-only)" },
              { key: "SPOTIFY_CLIENT_ID",                   ok: integrations.spotifyId,      note: "Spotify app client ID" },
              { key: "SPOTIFY_CLIENT_SECRET",               ok: integrations.spotifySecret,  note: "Spotify app client secret (server-only)" },
              { key: "NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN",    ok: integrations.shopifyDomain,  note: "Shopify store domain" },
              { key: "SHOPIFY_ADMIN_ACCESS_TOKEN",          ok: integrations.shopifyToken,   note: "Shopify admin token (server-only)" },
              { key: "NEXT_PUBLIC_SITE_URL",                ok: integrations.siteUrl,        note: "Canonical site URL for SEO" },
            ].map(({ key, ok, note }) => (
              <div key={key} className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
                <StatusDot ok={ok} />
                <div className="min-w-0 flex-1">
                  <code className="text-xs font-mono text-white/55 break-all">{key}</code>
                  <p className="text-[10px] text-white/25 mt-0.5">{note}</p>
                </div>
                <span className={`text-[10px] shrink-0 ${ok ? "text-emerald-400/70" : "text-white/20"}`}>
                  {ok ? "set" : "missing"}
                </span>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-white/[0.06] bg-white/[0.01]">
            <p className="text-xs text-white/25">
              Variable values are never shown here. Configure them in your{" "}
              <code className="font-mono text-white/35">.env.local</code> file or deployment
              environment.
            </p>
          </div>
        </SectionCard>
      </section>

      {/* ── Coming Soon ── */}
      <section>
        <SectionCard>
          <SectionTitle>Coming Soon</SectionTitle>
          <div className="px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "User Management",    desc: "Invite, provision, and revoke user accounts directly from admin." },
                { label: "Audit Log",          desc: "Track all CMS mutations with timestamp, user, and change diff." },
                { label: "Email Notifications",desc: "Notify owner on release publish, new royalty period, and errors." },
                { label: "Webhook Config",     desc: "Route DistroKid, Shopify, or custom event webhooks into the platform." },
              ].map(({ label, desc }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/[0.06] border-dashed bg-white/[0.01] px-4 py-3"
                >
                  <p className="text-sm text-white/40 font-medium mb-1">{label}</p>
                  <p className="text-xs text-white/25 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </section>

    </main>
  )
}
