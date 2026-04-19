"use client";

import { motion } from "framer-motion";
import { mockArtists, mockReleases, mockProducers } from "@/lib/mockData";

const stats = [
  { label: "Total Artists", value: mockArtists.length.toString(), icon: "🎤", change: "+2 this month" },
  { label: "Total Releases", value: mockReleases.length.toString(), icon: "💿", change: "+3 this month" },
  { label: "Total Producers", value: mockProducers.length.toString(), icon: "🎛️", change: "+1 this month" },
  { label: "Total Streams", value: "10.2M", icon: "▶️", change: "+500K this month" },
];

const recentActivity = [
  { action: "New release published", detail: "Midnight Crown by Phantom Waves", time: "2 hours ago" },
  { action: "Artist profile updated", detail: "Solara - bio and photos updated", time: "5 hours ago" },
  { action: "New artist signed", detail: "Meridian joins the SUMG roster", time: "1 day ago" },
  { action: "Release scheduled", detail: "Void Frequencies - drop in 3 days", time: "2 days ago" },
  { action: "Brand partnership", detail: "SUMG Apparel x Major Retailer", time: "3 days ago" },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-white mb-1">Dashboard</h1>
          <p className="text-gray-400 text-sm">Welcome back. Here&apos;s what&apos;s happening at SUMG Records.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-dark-800 border border-gray-800 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  {stat.change}
                </span>
              </div>
              <p className="text-3xl font-bold font-serif text-white mb-1">{stat.value}</p>
              <p className="text-gray-500 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-dark-800 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold font-serif text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex items-start gap-4 pb-4 border-b border-gray-800/50 last:border-0 last:pb-0"
              >
                <div className="w-2 h-2 rounded-full bg-gold-500 mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{item.action}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{item.detail}</p>
                </div>
                <span className="text-gray-600 text-xs flex-shrink-0">{item.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
