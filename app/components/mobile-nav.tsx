"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navLinks = [
  { href: "/artists", label: "Artists" },
  { href: "/producers", label: "Producers" },
  { href: "/brands", label: "Brands" },
  { href: "/releases", label: "Releases" },
  { href: "/news", label: "News" },
]

export default function MobileNav({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean
  isAdmin: boolean
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden flex flex-col gap-1.5 p-2 -mr-2"
      >
        <span
          className={`block w-5 h-px bg-white transition-all duration-200 origin-center ${open ? "rotate-45 translate-y-[7px]" : ""}`}
        />
        <span
          className={`block w-5 h-px bg-white transition-all duration-200 ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block w-5 h-px bg-white transition-all duration-200 origin-center ${open ? "-rotate-45 -translate-y-[7px]" : ""}`}
        />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-[#06070a] flex flex-col px-6 py-8">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-3 text-lg font-medium text-white/70 hover:text-white border-b border-white/8 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-center text-white/70 hover:border-white/40 hover:text-white transition"
                  >
                    Admin Panel
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-center text-black hover:bg-white/90 transition"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-center text-black hover:bg-white/90 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
