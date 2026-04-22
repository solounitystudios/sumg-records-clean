import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { EmailCapture } from "@/components/site/EmailCapture";

export const metadata = { title: "Membership — SUMG Records" };

const TIERS = [
  {
    id: "inner-circle",
    name: "Inner Circle",
    price: "$9 / month",
    description:
      "Early access to drops, exclusive behind-the-scenes content, stems & instrumentals, member-only editorial releases, and direct artist updates before anyone else.",
    perks: [
      "Early drop access — 72h before public",
      "Exclusive stems & instrumentals",
      "Behind-the-scenes content",
      "Member-only editorial releases",
      "Priority merch access",
      "Direct artist dispatch emails",
    ],
    cta: "Join the Inner Circle",
    ctaHref: "/contact?subject=Inner+Circle+Membership+Inquiry",
    highlight: true,
  },
  {
    id: "label-list",
    name: "Label List",
    price: "Free",
    description:
      "Stay connected. Get notified on new releases, merch drops, and label news. No spam — only signal.",
    perks: [
      "New release announcements",
      "Merch drop notifications",
      "Label news & campaign updates",
    ],
    cta: null,
    ctaHref: null,
    highlight: false,
  },
];

export default function MembershipPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
              Fan Access
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none mb-6">
              Membership
            </h1>
            <p className="text-sm text-white/35 max-w-md leading-relaxed">
              Two ways to be part of the SUMG ecosystem — from the front row or
              the inner circle.
            </p>
          </div>
        </section>

        {/* Tiers */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.04] max-w-4xl">
              {TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`bg-black p-10 flex flex-col gap-6 ${
                    tier.highlight ? "ring-1 ring-white/10" : ""
                  }`}
                >
                  {tier.highlight && (
                    <span className="self-start text-[9px] tracking-[0.3em] uppercase border border-white/20 text-white/50 px-3 py-1">
                      Recommended
                    </span>
                  )}

                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-2">
                      {tier.name}
                    </p>
                    <p className="text-3xl font-black text-white tracking-tight">
                      {tier.price}
                    </p>
                  </div>

                  <p className="text-sm text-white/40 leading-relaxed">
                    {tier.description}
                  </p>

                  <ul className="space-y-2.5">
                    {tier.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-3 text-xs text-white/50"
                      >
                        <span className="text-white/25 mt-0.5 shrink-0">✓</span>
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-4">
                    {tier.cta && tier.ctaHref ? (
                      <a
                        href={tier.ctaHref}
                        className="inline-flex items-center gap-2 bg-white text-black text-[10px] tracking-[0.25em] uppercase px-8 py-3.5 hover:bg-white/90 transition-colors"
                      >
                        {tier.cta}
                      </a>
                    ) : (
                      <EmailCapture
                        source="membership"
                        variant="stacked"
                        heading="Subscribe — it's free"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 mb-10">
              Questions
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-3xl">
              {[
                {
                  q: "When does Inner Circle launch?",
                  a: "We're currently building the Inner Circle experience. Sign up via the inquiry link above and you'll be first to know — and first to access.",
                },
                {
                  q: "What payment methods are accepted?",
                  a: "Inner Circle memberships will be processed via Stripe. All major credit cards accepted.",
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes. Month-to-month. Cancel with one click from your member portal.",
                },
                {
                  q: "Is this different from just following on social?",
                  a: "Yes. The Inner Circle gets content and access that never appears on social. It is a separate layer of the SUMG ecosystem.",
                },
              ].map(({ q, a }) => (
                <div key={q}>
                  <p className="text-sm font-semibold text-white/70 mb-2">{q}</p>
                  <p className="text-xs text-white/35 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
