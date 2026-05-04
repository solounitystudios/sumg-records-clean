import { Navbar } from "@/components/site/Navbar"
import { Footer } from "@/components/site/Footer"
import { getAllProducers } from "@/lib/cms"
import Link from "next/link"
import type { CMSProducer } from "@/lib/types"

export const metadata = {
  title: "Beat Licensing — SUMG Records",
  description:
    "License beats from SUMG Records producers. Basic leases from $29. Premium and exclusive rights available.",
  openGraph: {
    title: "Beat Licensing — SUMG Records",
    description: "License beats from SUMG Records producers. Basic leases from $29.",
  },
}

// ─── Pricing tiers ───────────────────────────────────────────────────────────

const TIERS = [
  {
    id:    "basic",
    name:  "Basic Lease",
    price: "$29",
    color: "border-white/10 bg-white/[0.025]",
    badge: "text-white/40",
    perks: [
      "MP3 + WAV stems",
      "Non-exclusive rights",
      "Up to 10K streams",
      "YouTube monetization",
      "1 commercial use",
    ],
  },
  {
    id:    "premium",
    name:  "Premium Lease",
    price: "$79",
    color: "border-violet-500/25 bg-violet-500/[0.04]",
    badge: "text-violet-400",
    perks: [
      "MP3 + WAV + tracked stems",
      "Non-exclusive rights",
      "Unlimited streams",
      "Full monetization",
      "5 commercial uses",
    ],
    highlight: true,
  },
  {
    id:    "exclusive",
    name:  "Exclusive Rights",
    price: "From $499",
    color: "border-amber-500/20 bg-amber-500/[0.03]",
    badge: "text-amber-400",
    perks: [
      "All stem files",
      "Full ownership transfer",
      "Unlimited everything",
      "Beat retired from catalog",
      "Contract provided",
    ],
  },
]

// ─── License CTA ─────────────────────────────────────────────────────────────

function licenseMailto(producer: CMSProducer, tier: string): string {
  const subject = encodeURIComponent(`Beat License Inquiry — ${tier} — ${producer.name}`)
  const body = encodeURIComponent(
    `Hi,\n\nI'm interested in a ${tier} license for beats produced by ${producer.name}.\n\nPlease send me available tracks and next steps.\n\nThanks`
  )
  return `mailto:licensing@sumgrecords.com?subject=${subject}&body=${body}`
}

// ─── Producer card ────────────────────────────────────────────────────────────

function ProducerCard({ producer }: { producer: CMSProducer }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0a0b0f] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-1">
              {producer.specialty}
            </p>
            <h2 className="text-xl font-black tracking-tight text-white leading-none">
              {producer.name}
            </h2>
            {producer.credits && (
              <p className="text-xs text-white/30 mt-1.5">{producer.credits} credits</p>
            )}
          </div>
          {producer.ytChannelUrl && (
            <a
              href={producer.ytChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[10px] text-white/25 hover:text-white/60 border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Hear Beats ↗
            </a>
          )}
        </div>
        {producer.bio && (
          <p className="text-sm text-white/35 mt-3 leading-relaxed line-clamp-2">
            {producer.bio}
          </p>
        )}
        {producer.signature && (
          <p className="text-[11px] text-violet-400/50 mt-3 italic">
            &ldquo;{producer.signature}&rdquo;
          </p>
        )}
      </div>

      {/* License options */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {TIERS.map((tier) => (
          <a
            key={tier.id}
            href={licenseMailto(producer, tier.name)}
            className={`group rounded-xl border p-3 transition-all hover:scale-[1.02] ${tier.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[9px] uppercase tracking-[0.2em] font-medium ${tier.badge}`}>
                {tier.name}
              </span>
              {tier.highlight && (
                <span className="text-[8px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded uppercase tracking-wide">
                  Popular
                </span>
              )}
            </div>
            <p className="text-lg font-black text-white mb-2">{tier.price}</p>
            <ul className="space-y-0.5">
              {tier.perks.map((perk) => (
                <li key={perk} className="text-[10px] text-white/35 flex items-center gap-1.5">
                  <span className="text-white/20">·</span>
                  {perk}
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[10px] text-white/25 group-hover:text-white/60 transition-colors">
              License this →
            </div>
          </a>
        ))}
      </div>

      <div className="px-4 pb-4">
        <Link
          href={`/producers/${producer.slug}`}
          className="text-[10px] tracking-[0.15em] uppercase text-white/20 hover:text-white/50 transition-colors"
        >
          View Producer Profile →
        </Link>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BeatsPage() {
  const allProducers = await getAllProducers()
  const activeProducers = allProducers.filter(
    (p) => !p.status || p.status === "active"
  )

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative min-h-[40vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-end pr-10 select-none pointer-events-none overflow-hidden">
            <span className="text-[14vw] font-black text-white/[0.018] tracking-tighter leading-none">
              BEATS
            </span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-16 pt-32">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
              SUMG Records · Licensing
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none mb-4">
              Beat Licensing
            </h1>
            <p className="text-sm text-white/35 max-w-lg leading-relaxed">
              In-house production from SUMG producers. Basic leases from $29.
              Exclusive rights and custom beats available on request.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-14 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-8">
              How It Works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
              {[
                {
                  step: "01",
                  title: "Browse producers",
                  desc: "Explore each producer's style and listen to their catalog via YouTube.",
                },
                {
                  step: "02",
                  title: "Pick your tier",
                  desc: "Basic lease, premium stems, or full exclusive — we'll send options.",
                },
                {
                  step: "03",
                  title: "License & record",
                  desc: "Files delivered within 24h. Contract included on exclusive deals.",
                },
              ].map((s) => (
                <div key={s.step}>
                  <p className="text-[10px] font-mono text-white/15 mb-2">{s.step}</p>
                  <p className="text-sm font-semibold text-white/70 mb-1">{s.title}</p>
                  <p className="text-xs text-white/30 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Producers */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
              <div>
                <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-2">
                  Available Now
                </p>
                <h2 className="text-3xl font-black tracking-tight text-white">
                  Our Producers
                </h2>
              </div>
              <a
                href="mailto:licensing@sumgrecords.com?subject=Custom%20Beat%20Request"
                className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white border border-white/10 hover:border-white/30 px-4 py-2.5 rounded-xl transition-colors"
              >
                Request Custom Beat →
              </a>
            </div>

            {activeProducers.length === 0 ? (
              <p className="text-white/20 text-sm">No producers available yet.</p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {activeProducers.map((producer) => (
                  <ProducerCard key={producer.id} producer={producer} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sync licensing CTA */}
        <section className="py-20 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-4">
                Film · TV · Ads · Games
              </p>
              <h2 className="text-3xl font-black tracking-tight text-white mb-4">
                Sync Licensing
              </h2>
              <p className="text-sm text-white/35 leading-relaxed mb-8">
                Looking to license SUMG music for a film, commercial, game, or
                sync placement? We handle one-stop sync clearance for our full
                catalog — master and publishing in one deal.
              </p>
              <a
                href="mailto:sync@sumgrecords.com?subject=Sync%20Licensing%20Inquiry"
                className="inline-block bg-white text-black text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 font-semibold hover:bg-white/90 transition-colors"
              >
                Contact Sync Team →
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
