"use client";

import { motion } from "framer-motion";
import { ReleaseCard } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { mockReleases } from "@/lib/mockData";

export default function FeaturedReleases() {
  const featured = mockReleases.slice(0, 4);

  return (
    <section className="py-20 bg-dark-800/50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12"
        >
          <div>
            <p className="text-gold-500 text-xs font-medium tracking-[0.3em] uppercase mb-3">
              Discography
            </p>
            <h2 className="text-4xl md:text-5xl font-bold font-serif text-white">
              Latest Releases
            </h2>
          </div>
          <Button href="/releases" variant="outline" className="mt-4 md:mt-0">
            View All Releases →
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((release, index) => (
            <motion.div
              key={release.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ReleaseCard {...release} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
