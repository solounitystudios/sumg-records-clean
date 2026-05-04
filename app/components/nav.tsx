import Link from "next/link"
import { getAuthUser, isExecutiveRole } from "@/lib/auth"
import MobileNav from "./mobile-nav"

const navLinks = [
  { href: "/artists", label: "Artists" },
  { href: "/producers", label: "Producers" },
  { href: "/beats", label: "Beats" },
  { href: "/releases", label: "Releases" },
  { href: "/shop", label: "Shop" },
]

export default async function Nav() {
  const session = await getAuthUser()

  return (
    <nav className="border-b border-white/10 bg-[#06070a]/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-6 md:px-10 flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-sm font-semibold tracking-[0.2em] uppercase text-white shrink-0">
          SUMG
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/60 hover:text-white transition"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                {isExecutiveRole(session.role) && (
                  <Link
                    href="/admin"
                    className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white transition hover:border-white/40 hover:bg-white/5"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white transition hover:border-white/40 hover:bg-white/5"
              >
                Sign In
              </Link>
            )}
          </div>

          <MobileNav
            isLoggedIn={session !== null}
            isAdmin={isExecutiveRole(session?.role ?? "")}
          />
        </div>
      </div>
    </nav>
  )
}
