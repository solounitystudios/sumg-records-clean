"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type NavItem = { label: string; href: string; exact?: boolean };
type NavSection = {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
};

type SidebarStorage = {
  collapsed: Record<string, boolean>;
  compact: boolean;
};

const STORAGE_KEY = "sumg-admin-sidebar-v2";

// ─── Navigation structure ────────────────────────────────────────────────────

const NAV: NavSection[] = [
  {
    key: "home",
    label: "HOME",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 6.5L8 2l6 4.5V14a.5.5 0 01-.5.5h-3.75v-3.75h-3.5V14.5H2.5A.5.5 0 012 14V6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
    items: [
      { label: "Command Center", href: "/admin", exact: true },
      { label: "Live Dashboard", href: "/admin/dashboard" },
      { label: "Alerts", href: "/admin/alerts" },
      { label: "Activity", href: "/admin/activity" },
    ],
  },
  {
    key: "content",
    label: "CONTENT ENGINE",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.5 5.5l4 2.5-4 2.5V5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
    items: [
      { label: "Audio Inbox", href: "/admin/youtube/inbox" },
      { label: "Thumbnail Studio", href: "/admin/youtube/thumbnail-studio" },
      { label: "Upload Queue", href: "/admin/youtube/queue" },
      { label: "Publishing Calendar", href: "/admin/youtube/schedule" },
    ],
  },
  {
    key: "catalog",
    label: "CATALOG",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.2" />
        <rect x="9" y="2" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.2" />
        <rect x="2" y="9" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.2" />
        <rect x="9" y="9" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    items: [
      { label: "Artists", href: "/admin/artists" },
      { label: "Producers", href: "/admin/producers" },
      { label: "Songs", href: "/admin/songs" },
      { label: "Releases", href: "/admin/releases" },
      { label: "Lyrics", href: "/admin/lyrics" },
      { label: "Brands", href: "/admin/brands" },
    ],
  },
  {
    key: "media",
    label: "MEDIA",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="5.5" cy="6.5" r="1.25" stroke="currentColor" strokeWidth="1.1" />
        <path d="M2 11l3.5-3 2.5 2 2-1.5L14 11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    items: [
      { label: "Assets", href: "/admin/assets" },
      { label: "Messages", href: "/admin/messages" },
      { label: "Imports", href: "/admin/imports" },
    ],
  },
  {
    key: "growth",
    label: "GROWTH",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <polyline points="2,12 6,7 9,10 14,4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="10,4 14,4 14,8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    items: [
      { label: "Analytics", href: "/admin/analytics" },
      { label: "SEO", href: "/admin/seo" },
      { label: "Memberships", href: "/admin/memberships" },
      { label: "Social Accounts", href: "/admin/social" },
    ],
  },
  {
    key: "commerce",
    label: "COMMERCE",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 3h1.5l1.8 7h6.2l1.5-5H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.5" cy="12.5" r="1" stroke="currentColor" strokeWidth="1.1" />
        <circle cx="11.5" cy="12.5" r="1" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    ),
    items: [
      { label: "Storefront", href: "/admin/storefront" },
      { label: "Orders", href: "/admin/orders" },
      { label: "Products", href: "/admin/products" },
    ],
  },
  {
    key: "business",
    label: "BUSINESS",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="7" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    items: [
      { label: "Revenue", href: "/admin/revenue" },
      { label: "Royalties", href: "/admin/royalties" },
      { label: "Rights", href: "/admin/rights" },
      { label: "Finance", href: "/admin/finance" },
      { label: "Contracts", href: "/admin/contracts" },
    ],
  },
  {
    key: "integrations",
    label: "INTEGRATIONS",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="4" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="12" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.5 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    items: [
      { label: "Music Platforms", href: "/admin/integrations/music" },
      { label: "Social Platforms", href: "/admin/integrations/social" },
      { label: "AI Providers", href: "/admin/integrations/ai" },
      { label: "Payments", href: "/admin/integrations/payments" },
    ],
  },
  {
    key: "system",
    label: "SYSTEM",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1.1 1.1M11.1 11.1l1.1 1.1M3.8 12.2l1.1-1.1M11.1 4.9l1.1-1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    items: [
      { label: "Settings", href: "/admin/settings" },
      { label: "Users", href: "/admin/users" },
      { label: "Security", href: "/admin/security" },
      { label: "Logs", href: "/admin/logs" },
    ],
  },
];

// ─── All items flat list (for command palette) ───────────────────────────────

const ALL_ITEMS: Array<NavItem & { section: string }> = NAV.flatMap((s) =>
  s.items.map((item) => ({ ...item, section: s.label }))
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function isSectionActive(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => isItemActive(pathname, item));
}

function loadStorage(): SidebarStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SidebarStorage;
  } catch {
    // ignore
  }
  return { collapsed: {}, compact: false };
}

function saveStorage(data: SidebarStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// ─── Chevron icon ────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className={`transition-transform duration-200 shrink-0 ${open ? "rotate-90" : ""}`}
    >
      <path
        d="M3.5 2L6.5 5L3.5 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Command palette ─────────────────────────────────────────────────────────

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim()
    ? ALL_ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q)
        );
      }).slice(0, 8)
    : ALL_ITEMS.slice(0, 8);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (results[activeIdx]) navigate(results[activeIdx].href);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-[#0f1016] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/30 shrink-0" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[13px] text-white placeholder-white/25 outline-none"
          />
          <span className="text-[10px] text-white/20 border border-white/[0.08] rounded px-1.5 py-0.5 shrink-0">
            ESC
          </span>
        </div>

        {/* Results */}
        <ul className="max-h-72 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-[12px] text-white/25">
              No results for &quot;{query}&quot;
            </li>
          ) : (
            results.map((item, i) => (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full text-left flex items-center justify-between px-4 py-2.5 transition-colors duration-100 ${
                    i === activeIdx
                      ? "bg-white/[0.06] text-white"
                      : "text-white/55 hover:text-white/80"
                  }`}
                >
                  <span className="text-[12px] tracking-[0.02em]">{item.label}</span>
                  <span className="text-[10px] text-white/25 tracking-[0.08em] uppercase ml-3 shrink-0">
                    {item.section}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

// ─── Nav content (shared desktop + mobile) ───────────────────────────────────

function NavContent({
  compact,
  onNavClick,
}: {
  compact: boolean;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Restore collapsed state from localStorage on mount, but never collapse an active section
  useEffect(() => {
    const stored = loadStorage();
    const restored: Record<string, boolean> = {};
    NAV.forEach((s) => {
      const active = isSectionActive(pathname, s);
      // Force-expand sections that have an active route
      restored[s.key] = active ? false : (stored.collapsed[s.key] ?? false);
    });
    setCollapsed(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const stored = loadStorage();
      saveStorage({ ...stored, collapsed: next });
      return next;
    });
  }

  return (
    <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
      {NAV.map((section) => {
        const isOpen = !collapsed[section.key];
        const hasActive = isSectionActive(pathname, section);

        return (
          <div key={section.key} className="mb-0.5">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.key)}
              className={`w-full flex items-center justify-between transition-colors duration-150 ${
                compact ? "px-0 py-2.5 justify-center" : "px-4 py-2"
              } ${hasActive ? "text-white/50" : "text-white/20 hover:text-white/40"}`}
              title={compact ? section.label : undefined}
            >
              {compact ? (
                <span className={`mx-auto ${hasActive ? "text-violet-400" : ""}`}>
                  {section.icon}
                </span>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className={hasActive ? "text-violet-400/70" : "text-white/20"}>
                      {section.icon}
                    </span>
                    <span className="text-[9px] tracking-[0.22em] uppercase font-semibold">
                      {section.label}
                    </span>
                  </div>
                  <Chevron open={isOpen} />
                </>
              )}
            </button>

            {/* Section items */}
            {!compact && isOpen && (
              <div className="mt-0.5 mb-1">
                {section.items.map((item) => {
                  const active = isItemActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavClick}
                      className={`flex items-center pl-10 pr-4 py-[7px] text-[12px] tracking-[0.03em] transition-colors duration-150 border-l-2 ${
                        active
                          ? "text-white bg-white/[0.06] border-violet-500/70"
                          : "text-white/45 hover:text-white/80 hover:bg-white/[0.03] border-transparent"
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
  );
}

// ─── Desktop sidebar footer ──────────────────────────────────────────────────

function SidebarFooter({
  compact,
  onToggleCompact,
  onNavClick,
}: {
  compact: boolean;
  onToggleCompact: () => void;
  onNavClick?: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-white/[0.06] px-2 py-3 space-y-0.5">
      {!compact && (
        <>
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
        </>
      )}

      {/* Compact toggle */}
      <button
        onClick={onToggleCompact}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer"
        title={compact ? "Expand sidebar" : "Collapse sidebar"}
      >
        {compact ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="tracking-[0.08em] uppercase">Collapse</span>
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Restore compact state from localStorage on mount
  useEffect(() => {
    const stored = loadStorage();
    setCompact(stored.compact);
  }, []);

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
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Global Cmd+K listener
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [paletteOpen]);

  function toggleCompact() {
    const next = !compact;
    setCompact(next);
    const stored = loadStorage();
    saveStorage({ ...stored, compact: next });
    window.dispatchEvent(
      new CustomEvent("sidebar:compact", { detail: { compact: next } })
    );
  }

  return (
    <>
      {/* ── Command palette ───────────────────────────────────────────── */}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}

      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4 bg-[#08090d] border-b border-white/[0.06]">
        <Link
          href="/"
          className="text-[11px] font-black tracking-[0.22em] uppercase text-white/70"
        >
          SUMG <span className="text-white/25 font-light">ADMIN</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Search trigger (mobile) */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="p-2 text-white/40 hover:text-white transition"
            aria-label="Open command palette"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          {/* Hamburger */}
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
      </div>

      {/* ── Mobile drawer overlay ────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
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
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <NavContent compact={false} onNavClick={() => setDrawerOpen(false)} />

            {/* Mobile footer (no compact toggle) */}
            <div className="shrink-0 border-t border-white/[0.06] px-2 py-3 space-y-0.5">
              <Link
                href="/dashboard"
                onClick={() => setDrawerOpen(false)}
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
          </div>
        </div>
      )}

      {/* ── Desktop sidebar (fixed, lg+) ─────────────────────────────── */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r border-white/[0.06] bg-[#08090d] fixed top-0 left-0 bottom-0 z-40 transition-all duration-200 ${
          compact ? "w-14" : "w-56"
        }`}
      >
        {/* Header */}
        <div
          className={`h-14 flex items-center border-b border-white/[0.06] shrink-0 ${
            compact ? "justify-center px-2" : "px-4"
          }`}
        >
          {compact ? (
            <button
              onClick={() => setPaletteOpen(true)}
              className="text-white/30 hover:text-white/60 transition"
              aria-label="Open command palette"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <Link
                href="/"
                className="text-[11px] font-black tracking-[0.22em] uppercase text-white/70 hover:text-white transition-colors duration-200"
              >
                SUMG <span className="text-white/25 font-light">ADMIN</span>
              </Link>
              {/* Cmd+K hint */}
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-1 text-white/20 hover:text-white/50 transition"
                aria-label="Open command palette (⌘K)"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <NavContent compact={compact} />

        <SidebarFooter
          compact={compact}
          onToggleCompact={toggleCompact}
        />
      </aside>
    </>
  );
}
