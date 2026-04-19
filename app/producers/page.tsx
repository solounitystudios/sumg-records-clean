"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { mockProducers } from "@/lib/mockData";

export default function ProducersPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <p className="text-gold-500 text-xs font-medium tracking-[0.3em] uppercase mb-4">
          Production Team
        </p>
        <h1 className="text-5xl md:text-6xl font-bold font-serif text-white mb-4">
          Producers
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Meet the architects of sound behind SUMG Records — world-class producers crafting the beats that define an era.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {mockProducers.map((producer, index) => (
          <motion.div
            key={producer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card>
              <div className="flex gap-6 p-6">
                <div className="relative w-24 h-24 flex-shrink-0 rounded-full overflow-hidden border-2 border-gold-600/40">
                  <Image
                    src={producer.image}
                    alt={producer.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-serif text-white mb-1">
                    {producer.name}
                  </h3>
                  <p className="text-gold-500 text-sm mb-3">{producer.specialty}</p>
                  <p className="text-gray-400 text-sm leading-relaxed mb-3">{producer.bio}</p>
                  {producer.credits && producer.credits.length > 0 && (
                    <div>
                      <p className="text-gray-500 text-xs font-medium tracking-widest uppercase mb-1">
                        Notable Credits
                      </p>
                      <ul className="space-y-0.5">
                        {producer.credits.map((credit) => (
                          <li key={credit} className="text-gray-400 text-xs">
                            — {credit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
