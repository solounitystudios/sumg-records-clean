"use client";

import Link from "next/link";
import { AccessShell } from "@/components/access/AccessShell";

const FAQ = [
  {
    q: "How do I update my artist profile?",
    a: "Profile edits (bio, images, social links) are currently submitted as requests to your label manager. Self-serve editing is coming in Phase 2.",
  },
  {
    q: "Where are my royalty statements?",
    a: "Royalty statements appear in /access/artist/royalties once your label manager imports them via the revenue import tool. You can see your registration status (SoundExchange, PRO) there now.",
  },
  {
    q: "How do I see my Spotify analytics?",
    a: "Head to /access/artist/analytics. Follower and popularity snapshots are updated periodically by your label team. Advanced analytics charts are coming in Phase 4.",
  },
  {
    q: "What does the distribution status mean?",
    a: "\"Live\" means your release is live on all DSPs. \"Delivered\" means it's been submitted but may not be visible yet. \"Pending\" means it's in queue.",
  },
  {
    q: "Can I submit a new release?",
    a: "Release submission through the portal is coming in Phase 2. In the meantime, contact your label manager to initiate the release process.",
  },
  {
    q: "How is my account linked to my artist profile?",
    a: "Your account is linked via the artist_slug in your auth metadata, set by your label admin. If your account isn't showing your data, contact support below.",
  },
];

export default function SupportPage() {
  return (
    <AccessShell
      title="Support"
      breadcrumbs={[
        { label: "Access", href: "/access" },
        { label: "Support" },
      ]}
    >
      <div className="max-w-2xl space-y-10">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Help & Support</h2>
          <p className="text-[11px] text-white/30 mt-1">
            Documentation, FAQs, and how to reach your label management team.
          </p>
        </div>

        {/* FAQ */}
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-4">Frequently Asked</p>
          <div className="border border-white/5 divide-y divide-white/[0.04]">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="list-none cursor-pointer flex items-start justify-between gap-4">
                  <p className="text-[11px] text-white/60 group-open:text-white transition-colors">
                    {item.q}
                  </p>
                  <span className="text-white/20 group-open:rotate-180 transition-transform flex-shrink-0 text-xs mt-0.5">
                    ▾
                  </span>
                </summary>
                <p className="text-[11px] text-white/35 leading-relaxed mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-4">Contact</p>
          <div className="border border-white/5 divide-y divide-white/[0.04]">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[11px] text-white/60">Label Management</p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  For profile updates, release questions, and royalty inquiries
                </p>
              </div>
              <a
                href="mailto:access@sumgrecords.com"
                className="text-[9px] tracking-[0.15em] uppercase border border-white/10 px-3 py-1.5 text-white/35 hover:border-white/25 hover:text-white/60 transition-all flex-shrink-0"
              >
                Email →
              </a>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[11px] text-white/60">Public Site</p>
                <p className="text-[10px] text-white/30 mt-0.5">SUMG Records home</p>
              </div>
              <Link
                href="/"
                className="text-[9px] tracking-[0.15em] uppercase border border-white/10 px-3 py-1.5 text-white/35 hover:border-white/25 hover:text-white/60 transition-all"
              >
                Visit →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-4">Quick Links</p>
          <div className="grid grid-cols-2 gap-px bg-white/5">
            {[
              { label: "Dashboard", href: "/access/dashboard" },
              { label: "Releases", href: "/access/artist/releases" },
              { label: "Royalties", href: "/access/artist/royalties" },
              { label: "Settings", href: "/access/settings" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-black px-5 py-3 hover:bg-white/[0.03] transition-colors"
              >
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 hover:text-white/60 transition-colors">
                  {link.label} →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AccessShell>
  );
}
