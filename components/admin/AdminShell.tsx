"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCmsStore } from "@/lib/cms/store";
import { useRole } from "@/lib/auth/use-role";

type NavItem = { label: string; href: string; icon: string };
type NavDivider = { divider: true };

const adminNav: Array<NavItem | NavDivider> = [
  { label: "Dashboard",    href: "/admin",              icon: "⊞" },
  { label: "Artists",      href: "/admin/artists",      icon: "◎" },
  { label: "Producers",    href: "/admin/producers",    icon: "◉" },
  { label: "Songs",        href: "/admin/songs",        icon: "♫" },
  { label: "Brands",       href: "/admin/brands",       icon: "◐" },
  { label: "Releases",     href: "/admin/releases",     icon: "◑" },
  { divider: true },
  { label: "Catalog",      href: "/admin/catalog",      icon: "▦" },
  { label: "Publishing",   href: "/admin/publishing",   icon: "◙" },
  { label: "Rights",       href: "/admin/rights",       icon: "⊛" },
  { label: "Distribution", href: "/admin/distribution", icon: "▤" },
  { label: "Royalties",    href: "/admin/royalties",    icon: "◎" },
  { divider: true },
  { label: "Media",        href: "/admin/media",        icon: "◒" },
  { label: "Calendar",     href: "/admin/calendar",     icon: "◫" },
  { label: "Integrity",    href: "/admin/integrity",    icon: "◈" },
  { label: "Homepage",     href: "/admin/homepage",     icon: "◇" },
  { label: "Settings",     href: "/admin/settings",     icon: "◌" },
];

interface AdminShellProps {
  children: React.ReactNode;
  title: string;
}

export function AdminShell({ children, title }: AdminShellProps) {
  const pathname = usePathname();
  const { notifications, dismissNotification, isLoading, syncState, dataSource } =
    useCmsStore();
  const role = useRole();

  // ── Derive indicator values ─────────────────────────────────────────────────

  const syncDot =
    isLoading || syncState === "syncing"
      ? "bg-yellow-400 animate-pulse"
      : syncState === "error"
      ? "bg-red-500"
      : dataSource === "db"
      ? "bg-green-500"
      : "bg-white/20";

  const syncLabel =
    isLoading
      ? "Loading from DB…"
      : syncState === "syncing"
      ? "Saving…"
      : syncState === "error"
      ? "Sync error"
      : dataSource === "db"
      ? "DB"
      : "Seed data";

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 flex flex-col fixed top-0 left-0 bottom-0 z-40">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/5">
          <Link href="/" className="text-xs font-black tracking-[0.2em] uppercase text-white/80 hover:text-white">
            SUMG <span className="text-white/30 font-light">ADMIN</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {adminNav.map((item, idx) => {
            if ("divider" in item) {
              return (
                <div key={`div-${idx}`} className="mx-5 my-2 border-t border-white/[0.04]" />
              );
            }
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-2.5 text-[11px] tracking-[0.15em] uppercase transition-colors duration-200 ${
                  isActive
                    ? "text-white bg-white/[0.06] border-r border-white/20"
                    : "text-white/35 hover:text-white/70 hover:bg-white/[0.03]"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="border-t border-white/5 p-4">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full text-center text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors duration-200 py-2 cursor-pointer"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56">
        {/* Top bar */}
        <div className="h-14 border-b border-white/5 flex items-center px-8 sticky top-0 bg-neutral-950/90 backdrop-blur z-30">
          <h1 className="text-xs font-semibold tracking-[0.2em] uppercase text-white/60 flex-1">
            {title}
          </h1>

          {/* DB sync indicator */}
          <div className="flex items-center gap-2" title={syncLabel}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${syncDot}`} />
            <span className="text-[10px] tracking-[0.15em] uppercase text-white/20 select-none">
              {syncLabel}
            </span>
          </div>

          {/* Role badge */}
          <div className="ml-4 pl-4 border-l border-white/5 flex items-center gap-2">
            <span className="text-[9px] tracking-[0.15em] uppercase text-white/15 select-none">
              {role.roleLabel}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </main>

      {/* Toast notifications */}
      {notifications.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-3 px-4 py-3 text-xs border max-w-sm ${
                n.type === "success"
                  ? "bg-neutral-900 border-green-800/60 text-green-300"
                  : n.type === "error"
                  ? "bg-neutral-900 border-red-800/60 text-red-300"
                  : "bg-neutral-900 border-white/10 text-white/60"
              }`}
            >
              <span className="flex-1">{n.message}</span>
              <button
                onClick={() => dismissNotification(n.id)}
                className="text-white/30 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
