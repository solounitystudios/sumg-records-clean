"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: string };
type NavDivider = { divider: true };

const artistNav: Array<NavItem | NavDivider> = [
  { label: "Dashboard",   href: "/artist/dashboard",  icon: "⊞" },
  { label: "My Releases", href: "/artist/releases",   icon: "◑" },
  { label: "Upload",      href: "/artist/upload",     icon: "▲" },
  { divider: true },
  { label: "Profile",     href: "/artist/profile",    icon: "◎" },
  { label: "Alerts",      href: "/artist/alerts",     icon: "◈" },
  { label: "Tasks",       href: "/artist/tasks",      icon: "◧" },
];

interface ArtistShellProps {
  children: React.ReactNode;
  title: string;
  artistName?: string;
}

export function ArtistShell({ children, title, artistName }: ArtistShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 flex flex-col fixed top-0 left-0 bottom-0 z-40">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/5">
          <Link href="/" className="text-xs font-black tracking-[0.2em] uppercase text-white/80 hover:text-white">
            SUMG <span className="text-white/30 font-light">RECORDS</span>
          </Link>
        </div>

        {/* Artist tag */}
        {artistName && (
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 mb-0.5">Artist Portal</p>
            <p className="text-[11px] text-white/60 font-medium truncate">{artistName}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {artistNav.map((item, idx) => {
            if ("divider" in item) {
              return (
                <div key={`div-${idx}`} className="mx-5 my-2 border-t border-white/[0.04]" />
              );
            }
            const isActive =
              pathname === item.href ||
              (item.href !== "/artist/dashboard" && pathname.startsWith(item.href));
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

        {/* Footer */}
        <div className="border-t border-white/5 p-4">
          <Link
            href="/admin"
            className="block text-center text-[10px] tracking-[0.2em] uppercase text-white/20 hover:text-white/40 transition-colors py-1"
          >
            Admin Panel →
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56">
        {/* Top bar */}
        <div className="h-14 border-b border-white/5 flex items-center px-8 sticky top-0 bg-neutral-950/90 backdrop-blur z-30">
          <h1 className="text-xs font-semibold tracking-[0.2em] uppercase text-white/60 flex-1">
            {title}
          </h1>
          <span className="text-[9px] tracking-[0.15em] uppercase text-white/15 select-none">
            Artist Portal
          </span>
        </div>

        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
