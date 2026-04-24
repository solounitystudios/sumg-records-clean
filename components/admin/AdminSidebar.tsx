"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; exact?: boolean };
type NavSection = { key: string; label: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    key: "core",
    label: "CORE",
    items: [
      { label: "Command Center", href: "/admin", exact: true },
      { label: "Website / CMS",  href: "/admin/cms" },
      { label: "Analytics",      href: "/admin/analytics" },
      { label: "Intelligence",   href: "/admin/intelligence" },
    ],
  },
  {
    key: "catalog",
    label: "CATALOG",
    items: [
      { label: "Catalog",   href: "/admin/catalog" },
      { label: "Artists",   href: "/admin/artists" },
      { label: "Releases",  href: "/admin/releases" },
      { label: "Songs",     href: "/admin/lyrics" },
      { label: "Producers", href: "/admin/producers" },
      { label: "Brands",    href: "/admin/brands" },
      { label: "News",      href: "/admin/news" },
    ],
  },
  {
    key: "business",
    label: "BUSINESS",
    items: [
      { label: "Rights",     href: "/admin/rights" },
      { label: "Royalties",  href: "/admin/royalties" },
      { label: "Finance",    href: "/admin/finance" },
      { label: "Publishing", href: "/admin/publishing" },
      { label: "Contracts",  href: "/admin/contracts" },
      { label: "Documents",  href: "/admin/documents" },
      { label: "Parties",    href: "/admin/contributors" },
    ],
  },
  {
    key: "operations",
    label: "OPERATIONS",
    items: [
      { label: "Messages", href: "/admin/messages" },
      { label: "Assets",   href: "/admin/assets" },
      { label: "Imports",  href: "/admin/imports" },
      { label: "Spotify",       href: "/admin/spotify" },
      { label: "Apple Music",   href: "/admin/apple-music" },
      { label: "Tasks",         href: "/admin/tasks" },
    ],
  },
  {
    key: "system",
    label: "SYSTEM",
    items: [
      { label: "DNA",       href: "/admin/dna" },
      { label: "Integrity", href: "/admin/integrity" },
      { label: "Settings",  href: "/admin/settings" },
    ],
  },
];

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function isSectionActive(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => isItemActive(pathname, item));
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    >
      <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV.forEach((s) => { init[s.key] = false; });
    return init;
  });

  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-white/[0.06] bg-[#08090d] fixed top-0 left-0 bottom-0 z-40">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-white/[0.06] shrink-0">
        <Link
          href="/"
          className="text-[11px] font-black tracking-[0.22em] uppercase text-white/70 hover:text-white transition-colors duration-200"
        >
          SUMG <span className="text-white/25 font-light">ADMIN</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((section) => {
          const isOpen = !collapsed[section.key];
          const hasActive = isSectionActive(pathname, section);

          return (
            <div key={section.key} className="mb-1">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.key)}
                className={`w-full flex items-center justify-between px-5 py-2 group transition-colors duration-150 ${
                  hasActive ? "text-white/40" : "text-white/20 hover:text-white/35"
                }`}
              >
                <span className="text-[9px] tracking-[0.22em] uppercase font-semibold">
                  {section.label}
                </span>
                <Chevron open={isOpen} />
              </button>

              {/* Items */}
              {isOpen && (
                <div className="mt-0.5">
                  {section.items.map((item) => {
                    const active = isItemActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 pl-5 pr-4 py-2 text-[12px] tracking-[0.04em] transition-colors duration-150 border-l-2 ${
                          active
                            ? "text-white bg-white/[0.05] border-white/30"
                            : "text-white/40 hover:text-white/75 hover:bg-white/[0.03] border-transparent"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/[0.06] px-3 py-3 space-y-0.5">
        <Link
          href="/dashboard"
          className="flex items-center px-3 py-2 rounded-lg text-[11px] tracking-[0.06em] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors duration-150"
        >
          Artist Portal →
        </Link>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full text-left flex items-center px-3 py-2 rounded-lg text-[11px] tracking-[0.06em] text-white/25 hover:text-white/55 hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer"
          >
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
