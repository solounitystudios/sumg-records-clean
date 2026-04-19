"use client";

import { motion } from "framer-motion";
import { ArtistCard } from "@/components/ui/Card";
import { mockArtists } from "@/lib/mockData";

export default function ArtistsPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <p className="text-gold-500 text-xs font-medium tracking-[0.3em] uppercase mb-4">
          Our Roster
        </p>
        <h1 className="text-5xl md:text-6xl font-bold font-serif text-white mb-4">
          Artists
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Discover the exceptional talent signed to SUMG Records — artists pushing boundaries and shaping the future of music.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockArtists.map((artist, index) => (
          <motion.div
            key={artist.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <ArtistCard {...artist} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
