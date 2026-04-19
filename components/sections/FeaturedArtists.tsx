"use client";

import { motion } from "framer-motion";
import { ArtistCard } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { mockArtists } from "@/lib/mockData";

export default function FeaturedArtists() {
  const featured = mockArtists.slice(0, 3);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col md:flex-row md:items-end justify-between mb-12"
      >
        <div>
          <p className="text-gold-500 text-xs font-medium tracking-[0.3em] uppercase mb-3">
            Roster
          </p>
          <h2 className="text-4xl md:text-5xl font-bold font-serif text-white">
            Featured Artists
          </h2>
        </div>
        <Button href="/artists" variant="outline" className="mt-4 md:mt-0">
          View All Artists →
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {featured.map((artist, index) => (
          <motion.div
            key={artist.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <ArtistCard {...artist} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
