import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { logout } from "@/app/actions/auth"

const adminNav = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/releases", label: "Releases" },
  { href: "/admin/royalties", label: "Royalties" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return (
    <div className="min-h-screen bg-[#06070a] text-white flex">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#08090d]">
        <div className="px-5 py-6 border-b border-white/10">
          <p className="text-xs uppercase tracking-[0.3em] text-white/35">Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {adminNav.map((item) => (
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
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition text-left"
            >
              Sign Out
            </button>
          </form>
          <Link
            href="/dashboard"
            className="mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition"
          >
            Artist Dashboard →
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
