"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ReleaseCard } from "@/components/ui/Card";
import { mockReleases } from "@/lib/mockData";

const releaseTypes = ["all", "album", "ep", "single", "mixtape"] as const;
type ReleaseTypeFilter = (typeof releaseTypes)[number];

export default function ReleasesPage() {
  const [filter, setFilter] = useState<ReleaseTypeFilter>("all");

  const filtered =
    filter === "all"
      ? mockReleases
      : mockReleases.filter((r) => r.type === filter);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <p className="text-gold-500 text-xs font-medium tracking-[0.3em] uppercase mb-4">
          Discography
        </p>
        <h1 className="text-5xl md:text-6xl font-bold font-serif text-white mb-4">
          Releases
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Explore the complete SUMG Records discography — from chart-topping albums to game-changing singles.
        </p>
      </motion.div>

      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {releaseTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition-all duration-200 ${
              filter === type
                ? "bg-gold-600 text-dark-900"
                : "bg-dark-800 text-gray-400 border border-gray-700 hover:border-gold-600/40 hover:text-gold-400"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {filtered.map((release, index) => (
          <motion.div
            key={release.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            layout
          >
            <ReleaseCard {...release} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
