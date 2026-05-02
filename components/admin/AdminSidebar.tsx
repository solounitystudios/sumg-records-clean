"use client";

import { useState, useEffect } from "react";
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
      { label: "Songs",     href: "/admin/songs" },
      { label: "Lyrics",    href: "/admin/lyrics" },
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
      { label: "Messages",    href: "/admin/messages" },
      { label: "Assets",      href: "/admin/assets" },
      { label: "Imports",     href: "/admin/imports" },
      { label: "Spotify",     href: "/admin/spotify" },
      { label: "Apple Music", href: "/admin/apple-music" },
      { label: "YouTube",     href: "/admin/youtube" },
      { label: "Audio Inbox",       href: "/admin/youtube/inbox" },
      { label: "Thumbnail Studio", href: "/admin/youtube/thumbnail-studio" },
      { label: "Tasks",            href: "/admin/tasks" },
    ],
  },
  {
    key: "system",
    label: "SYSTEM",
    items: [
      { label: "DNA",            href: "/admin/dna", exact: true },
      { label: "DNA Builder",    href: "/admin/dna/builder" },
      { label: "DNA Packs",      href: "/admin/dna/packs" },
      { label: "DNA Variations", href: "/admin/dna/variations" },
      { label: "Integrity",      href: "/admin/integrity" },
      { label: "Settings",       href: "/admin/settings" },
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

// Shared nav content rendered in both desktop sidebar and mobile drawer
function NavContent({
  onNavClick,
}: {
  onNavClick?: () => void;
}) {
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
    <>
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((section) => {
          const isOpen = !collapsed[section.key];
          const hasActive = isSectionActive(pathname, section);

          return (
            <div key={section.key} className="mb-1">
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

              {isOpen && (
                <div className="mt-0.5">
                  {section.items.map((item) => {
                    const active = isItemActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavClick}
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

      <div className="shrink-0 border-t border-white/[0.06] px-3 py-3 space-y-0.5">
        <Link
          href="/dashboard"
          onClick={onNavClick}
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
    </>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4 bg-[#08090d] border-b border-white/[0.06]">
        <Link
          href="/"
          className="text-[11px] font-black tracking-[0.22em] uppercase text-white/70"
        >
          SUMG <span className="text-white/25 font-light">ADMIN</span>
        </Link>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col gap-1.5 p-2 text-white/50 hover:text-white transition"
          aria-label="Open navigation"
        >
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
        </button>
      </div>

      {/* ── Mobile drawer overlay ────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer panel */}
          <div
            className="relative w-64 max-w-[80vw] flex flex-col bg-[#08090d] border-r border-white/[0.06] h-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-12 flex items-center justify-between px-5 border-b border-white/[0.06] shrink-0">
              <Link
                href="/"
                className="text-[11px] font-black tracking-[0.22em] uppercase text-white/70"
              >
                SUMG <span className="text-white/25 font-light">ADMIN</span>
              </Link>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-white/30 hover:text-white transition p-1"
                aria-label="Close navigation"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <NavContent onNavClick={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar (fixed, lg+) ─────────────────────────────── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-white/[0.06] bg-[#08090d] fixed top-0 left-0 bottom-0 z-40">
        <div className="h-14 flex items-center px-5 border-b border-white/[0.06] shrink-0">
          <Link
            href="/"
            className="text-[11px] font-black tracking-[0.22em] uppercase text-white/70 hover:text-white transition-colors duration-200"
          >
            SUMG <span className="text-white/25 font-light">ADMIN</span>
          </Link>
        </div>

        <NavContent />
      </aside>
    </>
  );
}
