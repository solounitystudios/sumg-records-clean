"use client";

/**
 * components/access/AccessShell.tsx
 *
 * Shell layout for the SUMG ACCESS creator portal.
 *
 * Features:
 *   • Role-aware sidebar navigation (artist vs. staff/admin)
 *   • Desktop: persistent 220px sidebar, collapsible to icon-only at 64px
 *   • Mobile: hidden sidebar + bottom navigation bar (5 icons)
 *   • "CMS →" shortcut at the bottom for admin/staff users
 *   • Breadcrumb trail via `breadcrumbs` prop
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccessUser } from "@/lib/auth/use-access-user";

// ─── Navigation definitions ──────────────────────────────────────────────────

type NavItem = { label: string; href: string; icon: string; showOnMobile?: boolean };
type NavDivider = { divider: true };

const artistNav: Array<NavItem | NavDivider> = [
  { label: "Dashboard",    href: "/access/dashboard",          icon: "⊞", showOnMobile: true },
  { label: "Releases",     href: "/access/artist/releases",    icon: "◑", showOnMobile: true },
  { label: "Songs",        href: "/access/artist/songs",       icon: "♫" },
  { label: "Royalties",    href: "/access/artist/royalties",   icon: "◎", showOnMobile: true },
  { label: "Analytics",    href: "/access/artist/analytics",   icon: "◈", showOnMobile: true },
  { label: "Distribution", href: "/access/artist/distribution",icon: "▤" },
  { divider: true },
  { label: "Timeline",     href: "/access/artist/timeline",    icon: "◫" },
  { label: "Brands",       href: "/access/artist/brands",      icon: "◐" },
  { label: "Media",        href: "/access/artist/media",       icon: "◒" },
  { divider: true },
  { label: "Profile",      href: "/access/artist/profile",     icon: "◉", showOnMobile: true },
];

const staffNav: Array<NavItem | NavDivider> = [
  { label: "Overview",     href: "/access/staff",              icon: "⊞", showOnMobile: true },
  { label: "Artists",      href: "/access/staff/artists",      icon: "◎", showOnMobile: true },
  { label: "Releases",     href: "/access/staff/releases",     icon: "◑", showOnMobile: true },
  { label: "Publishing",   href: "/access/staff/publishing",   icon: "◙" },
  { label: "Royalties",    href: "/access/staff/royalties",    icon: "◎", showOnMobile: true },
  { divider: true },
  { label: "Distribution", href: "/access/staff/distribution", icon: "▤" },
  { label: "Calendar",     href: "/access/staff/calendar",     icon: "◫", showOnMobile: true },
  { label: "Media",        href: "/access/staff/media",        icon: "◒" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 py-2.5 text-[11px] tracking-[0.15em] uppercase transition-colors duration-200 ${
        collapsed ? "px-4 justify-center" : "px-5"
      } ${
        active
          ? "text-white bg-white/[0.06] border-r border-white/20"
          : "text-white/35 hover:text-white/70 hover:bg-white/[0.03]"
      }`}
    >
      <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface AccessShellProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: Breadcrumb[];
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export function AccessShell({ children, title, breadcrumbs }: AccessShellProps) {
  const pathname = usePathname();
  const user = useAccessUser();
  const [collapsed, setCollapsed] = useState(false);

  const isArtist = user.isArtistRole;
  const isCms = user.isCmsRole;
  const nav = isArtist ? artistNav : staffNav;

  // Mobile bottom-nav: items flagged showOnMobile (max 5)
  const mobileNav = nav
    .filter((item): item is NavItem => !("divider" in item) && !!item.showOnMobile)
    .slice(0, 5);

  const sidebarWidth = collapsed ? "w-16" : "w-56";
  const mainMargin = collapsed ? "lg:ml-16" : "lg:ml-56";

  function isActive(href: string): boolean {
    if (href === "/access/dashboard" || href === "/access/staff") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      {/* ── Sidebar (desktop only) ─────────────────────────────────────── */}
      <aside
        className={`hidden lg:flex ${sidebarWidth} border-r border-white/5 flex-col fixed top-0 left-0 bottom-0 z-40 transition-all duration-200`}
      >
        {/* Logo / wordmark */}
        <div className={`h-14 flex items-center border-b border-white/5 ${collapsed ? "justify-center px-2" : "px-5"}`}>
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="text-white/40 hover:text-white transition-colors text-lg"
              aria-label="Expand sidebar"
            >
              ≡
            </button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <Link
                href="/access/dashboard"
                className="text-xs font-black tracking-[0.2em] uppercase text-white/80 hover:text-white"
              >
                SUMG <span className="text-white/30 font-light">ACCESS</span>
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="text-white/20 hover:text-white/50 transition-colors text-sm ml-2"
                aria-label="Collapse sidebar"
              >
                ‹
              </button>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <span className="text-[9px] tracking-[0.3em] uppercase text-white/20">
              {user.roleLabel}
              {user.artistSlug && (
                <span className="ml-1 text-white/30">· {user.artistSlug}</span>
              )}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {nav.map((item, idx) => {
            if ("divider" in item) {
              return (
                <div
                  key={`div-${idx}`}
                  className={`my-2 border-t border-white/[0.04] ${collapsed ? "mx-2" : "mx-5"}`}
                />
              );
            }
            return (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            );
          })}
        </nav>

        {/* Footer: CMS link + notifications + sign out */}
        <div className="border-t border-white/5 py-3">
          {isCms && !collapsed && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-5 py-2 text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white/60 transition-colors"
            >
              <span className="text-base leading-none">⊕</span>
              CMS →
            </Link>
          )}
          {isCms && collapsed && (
            <Link
              href="/admin"
              title="CMS"
              className="flex justify-center px-4 py-2 text-base text-white/25 hover:text-white/60 transition-colors"
            >
              ⊕
            </Link>
          )}
          <Link
            href="/access/notifications"
            className={`flex items-center gap-3 py-2 text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white/50 transition-colors ${collapsed ? "px-4 justify-center" : "px-5"}`}
            title={collapsed ? "Notifications" : undefined}
          >
            <span className="text-base leading-none">◌</span>
            {!collapsed && "Notifications"}
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full text-[10px] tracking-[0.2em] uppercase text-white/20 hover:text-white/50 transition-colors duration-200 py-2 cursor-pointer text-center"
            >
              {collapsed ? "↑" : "Sign Out"}
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className={`flex-1 ${mainMargin} pb-20 lg:pb-0`}>
        {/* Top bar */}
        <div className="h-14 border-b border-white/5 flex items-center px-5 lg:px-8 sticky top-0 bg-neutral-950/95 backdrop-blur z-30">
          {/* Mobile logo */}
          <Link
            href="/access/dashboard"
            className="lg:hidden text-[11px] font-black tracking-[0.2em] uppercase text-white/70 mr-4"
          >
            ACCESS
          </Link>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5 min-w-0">
                    {i > 0 && <span className="text-white/15 text-xs">/</span>}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-[10px] tracking-[0.15em] uppercase text-white/30 hover:text-white/60 transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[10px] tracking-[0.15em] uppercase text-white/55 truncate">
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </>
            ) : (
              <h1 className="text-[11px] tracking-[0.2em] uppercase text-white/50">
                {title}
              </h1>
            )}
          </div>

          {/* Role badge (top-right, desktop only) */}
          <span className="hidden lg:block text-[9px] tracking-[0.2em] uppercase text-white/15 ml-4 select-none">
            {user.roleLabel}
          </span>
        </div>

        {/* Page content */}
        <div className="p-5 lg:p-8">{children}</div>
      </main>

      {/* ── Mobile bottom nav ──────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-neutral-950/98 backdrop-blur-md">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-200 ${
                  active ? "text-white" : "text-white/25"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[8px] tracking-[0.1em] uppercase leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
