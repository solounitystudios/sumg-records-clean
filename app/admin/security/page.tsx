import Link from "next/link"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Security — SUMG Admin" }

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${ok ? "bg-emerald-500" : "bg-white/15"}`} />
  )
}

export default async function SecurityPage() {
  const user = await requireAdmin()

  const supabaseUrl     = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey     = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const supabaseService = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / System</p>
          <h1 className="text-3xl font-semibold tracking-tight">Security</h1>
          <p className="mt-2 text-sm text-white/40">
            Authentication, route guards, and session policy.
          </p>
        </div>
        <Link href="/admin/settings" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">← Settings</Link>
      </div>

      <section className="mb-6">
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Auth Configuration</h2>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3 text-sm">
              <span className="text-white/35">Provider</span>
              <span className="text-white/70">Supabase Auth · Email / Password</span>

              <span className="text-white/35">Route guard</span>
              <span className="text-white/70">
                <code className="font-mono text-xs text-white/50">proxy.ts</code>
                {" "}middleware + layout{" "}
                <code className="font-mono text-xs text-white/50">requireAdmin()</code>
              </span>

              <span className="text-white/35">Admin roles</span>
              <span className="text-white/70">
                <code className="font-mono text-xs text-white/50">owner</code>,{" "}
                <code className="font-mono text-xs text-white/50">co_owner</code>,{" "}
                <code className="font-mono text-xs text-white/50">admin</code>
              </span>

              <span className="text-white/35">Session</span>
              <span className="text-white/70">JWT · Managed by Supabase Auth</span>

              <span className="text-white/35">Your role</span>
              <span className="text-white/80 font-mono text-xs">{user.role || "none"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Auth Backend</h2>
          </div>
          <div className="px-6">
            {[
              { label: "Supabase URL configured",        ok: supabaseUrl,     detail: "NEXT_PUBLIC_SUPABASE_URL" },
              { label: "Anon / publishable key",          ok: supabaseKey,     detail: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" },
              { label: "Service role key (server-only)",  ok: supabaseService, detail: "SUPABASE_SERVICE_ROLE_KEY · used for privileged admin writes" },
            ].map(({ label, ok, detail }) => (
              <div key={label} className="flex items-start justify-between gap-4 py-4 border-b border-white/[0.05] last:border-0">
                <div className="flex items-start gap-3">
                  <StatusDot ok={ok} />
                  <div>
                    <p className="text-sm font-medium text-white/80">{label}</p>
                    <p className="text-xs text-white/35 mt-0.5 leading-relaxed font-mono">{detail}</p>
                  </div>
                </div>
                <span className={`text-[10px] shrink-0 ${ok ? "text-emerald-400/70" : "text-white/20"}`}>
                  {ok ? "set" : "missing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Sign Out</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs text-white/35 mb-3 leading-relaxed">
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
      </section>

      <section>
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Coming Soon</h2>
          </div>
          <div className="px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Two-Factor Auth",   desc: "TOTP enrollment for owner and admin accounts." },
                { label: "Session Manager",   desc: "View and revoke active sessions across devices." },
                { label: "Audit Trail",       desc: "Login attempts, role changes, sensitive mutations." },
                { label: "IP Allowlist",      desc: "Restrict admin sign-in to approved networks." },
              ].map(({ label, desc }) => (
                <div key={label} className="rounded-xl border border-white/[0.06] border-dashed bg-white/[0.01] px-4 py-3">
                  <p className="text-sm text-white/40 font-medium mb-1">{label}</p>
                  <p className="text-xs text-white/25 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
