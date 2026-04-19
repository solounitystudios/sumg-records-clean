import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { FeaturedArtists } from "@/components/home/FeaturedArtists";
import { ProducerNetwork } from "@/components/home/ProducerNetwork";
import { BrandWorlds } from "@/components/home/BrandWorlds";
import { LatestReleases } from "@/components/home/LatestReleases";
import { VisionSection } from "@/components/home/VisionSection";

export default function Home() {
  return (
    <>
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex flex-col justify-end overflow-hidden bg-black">
        {/* Deep gradient background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 60%), linear-gradient(180deg, #0a0a0a 0%, #000000 100%)",
          }}
        />

        {/* Subtle horizontal line grid */}
        <div
          className="absolute inset-0 z-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(255,255,255,1) 79px, rgba(255,255,255,1) 80px)",
          }}
        />

        {/* Large background wordmark */}
        <div className="absolute inset-0 flex items-center justify-center z-0 select-none pointer-events-none overflow-hidden">
          <span
            className="font-black text-white leading-none tracking-tighter"
            style={{
              fontSize: "clamp(8rem, 28vw, 28rem)",
              opacity: 0.025,
              letterSpacing: "-0.04em",
            }}
          >
            SUMG
          </span>
        </div>

        {/* Top decorative lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-28 pt-40">
          <div className="max-w-3xl">
            {/* Label tag */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-white/30" />
              <p className="text-[10px] tracking-[0.4em] uppercase text-white/40">
                Premium Independent Label
              </p>
            </div>

            {/* Headline */}
            <h1
              className="font-black text-white leading-[0.92] tracking-tighter mb-8"
              style={{ fontSize: "clamp(3.5rem, 9vw, 8rem)" }}
            >
              Sound.
              <br />
              <span className="text-white/35">Vision.</span>
              <br />
              Culture.
            </h1>

            {/* Sub-copy */}
            <p className="text-sm md:text-base text-white/35 max-w-lg leading-relaxed mb-12">
              SUMG Records is an independent label building artists and sound
              worlds with precision. Seven artists. Five producers. One
              ecosystem.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#artists"
                className="inline-flex items-center gap-3 bg-white text-black text-[11px] tracking-[0.25em] uppercase px-8 py-4 font-semibold hover:bg-white/90 transition-colors duration-300"
              >
                Meet the Artists
              </a>
              <a
                href="#releases"
                className="inline-flex items-center gap-3 border border-white/15 text-white text-[11px] tracking-[0.25em] uppercase px-8 py-4 hover:border-white/35 hover:bg-white/[0.03] transition-all duration-300"
              >
                Latest Releases
              </a>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-20 pt-10 border-t border-white/5 grid grid-cols-3 gap-8 max-w-md">
            {[
              { value: "7", label: "Artists" },
              { value: "5", label: "Producers" },
              { value: "5", label: "Brand Worlds" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-black text-white tracking-tight leading-none">
                  {stat.value}
                </p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-10" />
      </section>

      {/* ─── Sections ─── */}
      <FeaturedArtists />
      <ProducerNetwork />
      <BrandWorlds />
      <LatestReleases />
      <VisionSection />
      <Footer />
    </>
  );
}
