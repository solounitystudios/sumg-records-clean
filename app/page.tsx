import type { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import FeaturedArtists from "@/components/sections/FeaturedArtists";
import FeaturedReleases from "@/components/sections/FeaturedReleases";

export const metadata: Metadata = {
  title: "SUMG Records | Premium Music Label",
  description:
    "SUMG Records is a premier independent music label dedicated to developing world-class artists and producing timeless music.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedArtists />
      <FeaturedReleases />

      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-gold-500 text-xs font-medium tracking-[0.3em] uppercase mb-4">
            Join the Movement
          </p>
          <h2 className="text-4xl md:text-5xl font-bold font-serif text-white mb-6">
            The Sound of the Future Starts Here
          </h2>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            SUMG Records is more than a label — it&apos;s an ecosystem of creativity, culture, and commerce.
          </p>
          <a
            href="/ecosystem"
            className="inline-flex items-center justify-center px-8 py-4 bg-gold-600 text-dark-900 font-semibold rounded hover:bg-gold-500 transition-all duration-200 text-base"
          >
            Explore the Ecosystem
          </a>
        </div>
      </section>
    </>
  );
}
