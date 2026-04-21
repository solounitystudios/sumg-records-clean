import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[9px] tracking-[0.4em] uppercase text-white/25 mb-4">404</p>
      <h1 className="text-4xl font-black tracking-tight text-white mb-4">
        Page Not Found
      </h1>
      <p className="text-sm text-white/40 max-w-sm leading-relaxed mb-10">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="bg-white text-black text-[11px] tracking-[0.25em] uppercase px-6 py-3 font-semibold hover:bg-white/90 transition-colors"
        >
          ← Home
        </Link>
        <Link
          href="/artists"
          className="text-[11px] tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors"
        >
          Browse Artists
        </Link>
      </div>
    </div>
  );
}
