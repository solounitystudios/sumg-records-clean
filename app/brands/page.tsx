"use client";

import { motion } from "framer-motion";
import { mockBrands } from "@/lib/mockData";

export default function BrandsPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <p className="text-gold-500 text-xs font-medium tracking-[0.3em] uppercase mb-4">
          The SUMG Portfolio
        </p>
        <h1 className="text-5xl md:text-6xl font-bold font-serif text-white mb-4">
          Brands &amp; Storefront
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Explore the full suite of SUMG brands — each one a pillar of our growing empire in music, culture, and commerce.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockBrands.map((brand, index) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="glass-effect rounded-xl p-8 hover:border-gold-600/50 transition-all duration-300 group cursor-pointer"
          >
            <div className="text-5xl mb-6">{brand.logo}</div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xl font-bold font-serif text-white group-hover:text-gold-400 transition-colors">
                {brand.name}
              </h3>
              <span className="text-xs text-gold-500 bg-gold-600/10 border border-gold-600/30 px-2 py-0.5 rounded-full">
                {brand.category}
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{brand.description}</p>
            {brand.url && (
              <a
                href={brand.url}
                className="text-gold-500 text-sm font-medium hover:text-gold-400 transition-colors inline-flex items-center gap-1"
              >
                Learn more <span>→</span>
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
