import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { signout } from "@/app/actions/auth"

const dashNav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/royalties", label: "Royalties" },
  { href: "/dashboard/releases", label: "Releases" },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()

  return (
    <div className="min-h-screen bg-[#06070a] text-white flex">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#08090d]">
        <div className="px-5 py-6 border-b border-white/10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/35">Artist Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {dashNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <form action={signout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition text-left"
            >
              Sign Out
            </button>
          </form>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition"
            >
              Admin Panel →
            </Link>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
