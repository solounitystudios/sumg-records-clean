"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { NavItem } from "@/types";

const navItems: NavItem[] = [
  { label: "Artists", href: "/artists" },
  { label: "Producers", href: "/producers" },
  { label: "Releases", href: "/releases" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Brands", href: "/brands" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-dark-900/95 backdrop-blur-md border-b border-gold-600/20 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gold-600 rounded-sm flex items-center justify-center">
              <span className="text-dark-900 font-bold text-sm font-serif">S</span>
            </div>
            <span className="text-xl font-bold font-serif tracking-wider">
              <span className="text-gold-gradient">SUMG</span>
              <span className="text-white ml-1">Records</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                  pathname === item.href
                    ? "text-gold-500"
                    : "text-gray-300 hover:text-gold-400"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/admin"
              className="px-4 py-2 bg-gold-600 text-dark-900 text-sm font-semibold rounded hover:bg-gold-500 transition-colors duration-200"
            >
              Admin
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 space-y-1.5 focus:outline-none"
            aria-label="Toggle menu"
          >
            <motion.span
              animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
              className="block w-6 h-0.5 bg-gold-500 transition-all duration-300"
            />
            <motion.span
              animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
              className="block w-6 h-0.5 bg-gold-500 transition-all duration-300"
            />
            <motion.span
              animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
              className="block w-6 h-0.5 bg-gold-500 transition-all duration-300"
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-dark-800/95 backdrop-blur-md border-t border-gold-600/20"
          >
            <div className="px-4 py-4 space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-2 text-sm font-medium tracking-wide transition-colors duration-200 ${
                    pathname === item.href
                      ? "text-gold-500"
                      : "text-gray-300 hover:text-gold-400"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/admin"
                className="block w-full text-center py-2 bg-gold-600 text-dark-900 text-sm font-semibold rounded hover:bg-gold-500 transition-colors duration-200"
              >
                Admin
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
