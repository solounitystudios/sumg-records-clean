"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const adminNavItems = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Artists", href: "/admin/artists", icon: "🎤" },
  { label: "Producers", href: "/admin/producers", icon: "🎛️" },
  { label: "Releases", href: "/admin/releases", icon: "💿" },
  { label: "Brands", href: "/admin/brands", icon: "🏷️" },
  { label: "Ecosystem", href: "/admin/ecosystem", icon: "🌐" },
  { label: "Analytics", href: "/admin/analytics", icon: "📈" },
  { label: "Settings", href: "/admin/settings", icon: "⚙️" },
];

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-dark-800 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <span className="text-gold-500 font-bold font-serif text-lg">SUMG Admin</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-gray-400 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <span className="text-xl">{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-dark-800 border-r border-gray-800 flex-col z-30">
        <div className="p-6 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gold-600 rounded flex items-center justify-center">
              <span className="text-dark-900 font-bold text-xs font-serif">S</span>
            </div>
            <span className="text-gold-500 font-bold font-serif">SUMG Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname === item.href
                  ? "bg-gold-600/20 text-gold-400 border border-gold-600/30"
                  : "text-gray-400 hover:bg-dark-700 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
          >
            <span>←</span> Back to Site
          </Link>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-dark-800 border-r border-gray-800 z-50 md:hidden flex flex-col pt-16"
            >
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname === item.href
                        ? "bg-gold-600/20 text-gold-400 border border-gold-600/30"
                        : "text-gray-400 hover:bg-dark-700 hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t border-gray-800">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
                >
                  <span>←</span> Back to Site
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
