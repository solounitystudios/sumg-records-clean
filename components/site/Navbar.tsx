"use client";

import { useEffect, useState } from "react";

const navLinks = [
  { label: "Artists", href: "#artists" },
  { label: "Producers", href: "#producers" },
  { label: "Brands", href: "#brands" },
  { label: "Releases", href: "#releases" },
  { label: "Vision", href: "#vision" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <a
          href="/"
          className="text-white font-black tracking-[0.12em] uppercase text-sm hover:text-white/70 transition-colors duration-300"
        >
          SUMG
          <span className="text-white/30 font-light tracking-widest ml-1.5 text-xs">
            RECORDS
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[11px] tracking-[0.2em] uppercase text-white/40 hover:text-white/90 transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <a
          href="#releases"
          className="hidden md:inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-black bg-white hover:bg-white/90 px-5 py-2.5 transition-all duration-300"
        >
          Listen Now
        </a>

        {/* Mobile menu indicator */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-1"
          aria-label="Menu"
        >
          <span className="w-5 h-px bg-white/60" />
          <span className="w-4 h-px bg-white/60" />
          <span className="w-5 h-px bg-white/60" />
        </button>
      </div>
    </header>
  );
}
