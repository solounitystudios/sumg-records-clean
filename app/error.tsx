"use client";

import Link from "next/link";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-[80vh] flex flex-col items-center justify-center bg-black">
        <div className="text-center px-6">
          <p className="text-[9px] tracking-[0.4em] uppercase text-white/20 mb-4">Error</p>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none mb-6">
            Something went wrong
          </h1>
          <p className="text-sm text-white/30 mb-10 max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred. Try again or return home.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={reset}
              className="inline-flex border border-white/10 text-white/40 text-[10px] tracking-[0.25em] uppercase px-8 py-3 hover:border-white/25 hover:text-white transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex border border-white/10 text-white/40 text-[10px] tracking-[0.25em] uppercase px-8 py-3 hover:border-white/25 hover:text-white transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
