"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/shopify/cartContext";

const navLinks = [
  { label: "Artists", href: "/artists" },
  { label: "Releases", href: "/releases" },
  { label: "Songs", href: "/songs" },
  { label: "Producers", href: "/producers" },
  { label: "Brands", href: "/brands" },
  { label: "About", href: "/about" },
  { label: "Shop", href: "/shop" },
];

const mobileLinks = [
  { label: "Home", href: "/" },
  { label: "Artists", href: "/artists" },
  { label: "Releases", href: "/releases" },
  { label: "Songs", href: "/songs" },
  { label: "Producers", href: "/producers" },
  { label: "Brands", href: "/brands" },
  { label: "About", href: "/about" },
  { label: "Shop", href: "/shop" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount, openCart } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || menuOpen
          ? "bg-black/90 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <a
          href="/"
          className="text-white font-black tracking-[0.12em] uppercase text-sm hover:text-white/70 transition-colors duration-300"
          onClick={closeMenu}
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

        {/* Desktop right cluster */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href="/contact"
            className="text-[10px] tracking-[0.2em] uppercase text-white/30 hover:text-white/70 transition-colors duration-300"
          >
            Contact
          </a>
          {/* Cart icon */}
          <button
            onClick={openCart}
            aria-label={`Open cart${itemCount > 0 ? ` (${itemCount} items)` : ""}`}
            className="relative text-white/35 hover:text-white transition-colors duration-300 p-1"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M1 1h2.5l1.8 9h9l1.7-6H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="7.5" cy="14.5" r="1" fill="currentColor"/>
              <circle cx="13.5" cy="14.5" r="1" fill="currentColor"/>
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>
          <a
            href="/releases"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-black bg-white hover:bg-white/90 px-5 py-2.5 transition-all duration-300"
          >
            Listen Now
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-3 -mr-3"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span
            className={`w-5 h-px bg-white/60 transition-transform duration-300 origin-center ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`}
          />
          <span
            className={`w-4 h-px bg-white/60 transition-opacity duration-300 ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`w-5 h-px bg-white/60 transition-transform duration-300 origin-center ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
          />
        </button>
      </div>

    </header>

    {/* Mobile full-screen overlay — fixed to viewport so content is never clipped */}
    <div
      className={`fixed inset-x-0 top-16 bottom-0 z-40 md:hidden overflow-y-auto bg-black/95 transition-opacity duration-300 ${
        menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <nav className="border-t border-white/5 px-6 py-6 flex flex-col gap-1">
        {mobileLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={closeMenu}
            className="text-[12px] tracking-[0.25em] uppercase text-white/45 hover:text-white py-3 border-b border-white/[0.04] last:border-0 transition-colors duration-300"
          >
            {link.label}
          </a>
        ))}
        <a
          href="/releases"
          onClick={closeMenu}
          className="mt-5 inline-flex items-center justify-center text-[10px] tracking-[0.25em] uppercase text-black bg-white hover:bg-white/90 px-5 py-3.5 transition-all duration-300"
        >
          Listen Now
        </a>
      </nav>
    </div>
    </>
  );
}
