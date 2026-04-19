"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-dark-900">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gold-600/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gold-500/5 blur-3xl" />
      </div>

      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-gold-500 text-sm font-medium tracking-[0.3em] uppercase mb-6">
            Premium Independent Label
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-serif leading-tight mb-6">
            <span className="text-white">Sound of</span>
            <br />
            <span className="text-gold-gradient">Excellence</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            SUMG Records is a premier independent music label dedicated to developing world-class artists and producing timeless music that transcends generations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/artists" size="lg">
              Our Artists
            </Button>
            <Button href="/releases" variant="outline" size="lg">
              Latest Releases
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          {[
            { value: "50+", label: "Artists" },
            { value: "200+", label: "Releases" },
            { value: "10M+", label: "Streams" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold font-serif text-gold-500">
                {stat.value}
              </p>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-5 h-8 rounded-full border border-gold-600/40 flex justify-center pt-1.5">
          <div className="w-1 h-2 rounded-full bg-gold-500" />
        </div>
      </motion.div>
    </section>
  );
}
