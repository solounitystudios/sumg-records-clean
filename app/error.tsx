"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service here if needed
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[9px] tracking-[0.4em] uppercase text-white/25 mb-4">Error</p>
      <h1 className="text-4xl font-black tracking-tight text-white mb-4">
        Something went wrong
      </h1>
      <p className="text-sm text-white/40 max-w-sm leading-relaxed mb-10">
        An unexpected error occurred. Try refreshing the page or returning to the site.
      </p>
      <div className="flex items-center gap-6">
        <button
          onClick={reset}
          className="bg-white text-black text-[11px] tracking-[0.25em] uppercase px-6 py-3 font-semibold hover:bg-white/90 transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="text-[11px] tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors"
        >
          ← Home
        </Link>
      </div>
    </div>
  );
}
