"use client";

import { motion } from "framer-motion";

const ecosystemItems = [
  {
    title: "Artist Development",
    description:
      "End-to-end artist development including vocal coaching, image consulting, branding, and career strategy.",
    icon: "🎤",
  },
  {
    title: "Music Production",
    description:
      "World-class in-house production team with state-of-the-art studios and cutting-edge sound design.",
    icon: "🎛️",
  },
  {
    title: "Distribution",
    description:
      "Global music distribution across all major streaming platforms and physical markets worldwide.",
    icon: "🌍",
  },
  {
    title: "Publishing & Rights",
    description:
      "Comprehensive music publishing, licensing, and rights management to maximize artist royalties.",
    icon: "📜",
  },
  {
    title: "Marketing & PR",
    description:
      "Strategic marketing campaigns, press outreach, and digital media management for maximum impact.",
    icon: "📣",
  },
  {
    title: "Brand Partnerships",
    description:
      "Connecting artists with premium brand partners for endorsements, collaborations, and sponsorships.",
    icon: "🤝",
  },
  {
    title: "Live Events",
    description:
      "Full-service concert booking, tour management, and exclusive listening party experiences.",
    icon: "🎪",
  },
  {
    title: "Digital Strategy",
    description:
      "Social media strategy, content creation, and digital marketing to grow artist fan bases.",
    icon: "📱",
  },
];

export default function EcosystemPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-gold-500 text-xs font-medium tracking-[0.3em] uppercase mb-4">
            The SUMG Universe
          </p>
          <h1 className="text-5xl md:text-6xl font-bold font-serif text-white mb-6">
            Our Ecosystem
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto leading-relaxed">
            SUMG Records is more than a music label. We&apos;ve built a complete ecosystem to support artists at every stage of their journey — from the studio to the stage, from their first release to global stardom.
          </p>
        </motion.div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ecosystemItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="bg-dark-800 border border-gray-800 hover:border-gold-600/40 rounded-lg p-6 transition-all duration-300 group"
            >
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="text-lg font-bold font-serif text-white mb-2 group-hover:text-gold-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center bg-dark-800 border border-gold-600/20 rounded-2xl p-12"
        >
          <p className="text-gold-500 text-xs font-medium tracking-[0.3em] uppercase mb-4">
            Our Mission
          </p>
          <blockquote className="text-2xl md:text-3xl font-bold font-serif text-white leading-relaxed">
            &ldquo;To cultivate extraordinary talent, build iconic brands, and create music that moves the world — one artist at a time.&rdquo;
          </blockquote>
          <p className="text-gold-500 font-semibold mt-6">— SUMG Records</p>
        </motion.div>
      </div>
    </div>
  );
}
