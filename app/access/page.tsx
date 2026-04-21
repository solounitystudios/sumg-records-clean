import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Access | Artist & Creator Login Portal",
  description:
    "Sign in to the SUMG Records creator portal. Access your artist dashboard, release management, royalty data, and brand operations.",
  openGraph: {
    title: "Access SUMG Records | Artist & Creator Login Portal",
    description:
      "Sign in to the SUMG Records creator portal. Access your artist dashboard, release management, royalty data, and brand operations.",
    url: "/access",
  },
};

const ACCESS_FEATURES = [
  {
    label: "Artist Dashboard",
    description: "Manage your profile, bio, and public presence on SUMG Records.",
  },
  {
    label: "Release Management",
    description: "Upload, schedule, and distribute your releases across all DSPs.",
  },
  {
    label: "Royalty Tracking",
    description: "Monitor earnings, publishing rights, and distribution status.",
  },
  {
    label: "Brand Worlds",
    description: "Collaborate across SUMG's five brand ecosystems.",
  },
];

export default function AccessPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative min-h-[50vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden">
            <span
              className="font-black text-white leading-none tracking-tighter"
              style={{
                fontSize: "clamp(6rem, 22vw, 22rem)",
                opacity: 0.025,
                letterSpacing: "-0.04em",
              }}
            >
              ACCESS
            </span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-40">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-white/30" />
              <p className="text-[10px] tracking-[0.4em] uppercase text-white/40">
                Creator Portal
              </p>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none mb-6">
              SUMG Records
              <br />
              <span className="text-white/30">Access</span>
            </h1>
            <p className="text-sm md:text-base text-white/35 max-w-lg leading-relaxed mb-10">
              The SUMG Records creator portal for artists, staff, and management.
              Sign in to access your dashboard, releases, royalties, and brand
              operations.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 bg-white text-black text-[11px] tracking-[0.25em] uppercase px-8 py-4 font-semibold hover:bg-white/90 transition-colors duration-300"
            >
              Sign In →
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-10">
              What's Inside
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
              {ACCESS_FEATURES.map((feature) => (
                <div key={feature.label} className="bg-black p-8">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-3">
                    {feature.label}
                  </p>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div>
              <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-2">
                Ready?
              </p>
              <p className="text-2xl font-black text-white tracking-tight">
                Sign in to your account
              </p>
              <p className="text-sm text-white/30 mt-1">
                Access restricted to SUMG operators and artists.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-3 bg-white text-black text-[11px] tracking-[0.25em] uppercase px-8 py-4 font-semibold hover:bg-white/90 transition-colors duration-300"
              >
                Sign In
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 border border-white/15 text-white text-[11px] tracking-[0.25em] uppercase px-8 py-4 hover:border-white/35 hover:bg-white/[0.03] transition-all duration-300"
              >
                Request Access
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
