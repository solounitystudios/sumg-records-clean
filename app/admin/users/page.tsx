import Link from "next/link"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Users — SUMG Admin" }

const ROLES = [
  { role: "owner",           tier: "Executive", desc: "Full label access. All admin, CMS, financial, and roster controls." },
  { role: "co_owner",        tier: "Executive", desc: "Same as owner. Shared label ownership access." },
  { role: "admin",           tier: "Executive", desc: "Full admin. Legacy role kept for backward compatibility." },
  { role: "editor",          tier: "CMS",       desc: "CMS access: create and edit artists, releases, news, lyrics." },
  { role: "media_manager",   tier: "CMS",       desc: "Media and asset management. Upload photos and files." },
  { role: "release_manager", tier: "CMS",       desc: "Release pipeline management. Manage release status and delivery." },
  { role: "artist",          tier: "Portal",    desc: "Artist portal only. Read-only access to own royalties and releases." },
] as const

const TIER_COLORS: Record<string, string> = {
  Executive: "bg-amber-500/10 text-amber-400/80 border-amber-500/20",
  CMS:       "bg-sky-500/10 text-sky-400/80 border-sky-500/20",
  Portal:    "bg-violet-500/10 text-violet-400/80 border-violet-500/20",
}

export default async function UsersPage() {
  const user = await requireAdmin()

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / System</p>
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="mt-2 text-sm text-white/40">
            User accounts, roles, and provisioning. Currently managed via Supabase Auth.
          </p>
        </div>
        <Link href="/admin/settings" className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors duration-150">← Settings</Link>
      </div>

      <section className="mb-6">
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Current Session</h2>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
              <span className="text-white/35">Email</span>
              <span className="text-white/80 font-mono text-xs break-all">{user.email ?? "—"}</span>
              <span className="text-white/35">User ID</span>
              <span className="text-white/50 font-mono text-xs break-all">{user.id}</span>
              <span className="text-white/35">Role</span>
              <span className="text-white/80 font-medium">{user.role || "none"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/40">Roles</h2>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/25 hover:text-white/50 transition-colors duration-150"
            >
              Manage in Supabase →
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
                  <tr key={r.role} className={r.role === user.role ? "bg-white/[0.03]" : ""}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white/60">{r.role}</span>
                        {r.role === user.role && (
                          <span className="text-[9px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded-full">you</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-full border ${TIER_COLORS[r.tier]}`}>
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
              Roles are stored in Supabase Auth under{" "}
              <code className="font-mono text-white/35">app_metadata.role</code>.
            </p>
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
                { label: "Invite Users",       desc: "Send signup invites by email with role pre-assigned." },
                { label: "Provision Artists",  desc: "Create artist portal accounts linked to roster entries." },
                { label: "Revoke Access",      desc: "Disable accounts and clear active sessions." },
                { label: "Role Audit",         desc: "Track role changes with timestamp, actor, and reason." },
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
