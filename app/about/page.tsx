import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export const metadata = { title: "About — SUMG Records" };

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-36 pb-24 border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-end pr-8 select-none pointer-events-none overflow-hidden">
            <span className="text-[18vw] font-black text-white/[0.018] tracking-tighter leading-none">
              SUMG
            </span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
              Who We Are
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none mb-10">
              About
              <br />
              <span className="text-white/30">SUMG</span>
            </h1>
            <div className="max-w-2xl space-y-6 text-base text-white/45 leading-loose">
              <p>
                SUMG Records is a premium independent music label built from the
                ground up. We do not follow industry templates. We build our own.
              </p>
              <p>
                Our roster is intentional. Seven artists. Each with a distinct
                world. Each developed with long-term vision, not short-term
                momentum.
              </p>
              <p>
                Our producers are architects. They do not make background music —
                they construct environments for the artists they serve.
              </p>
              <p>
                Beyond music, SUMG operates across five brand worlds: fashion,
                lifestyle, sound, visual arts, and publishing. Each world is its
                own identity. Together they form a system.
              </p>
              <p>
                We are independent by design. That means our artists retain
                ownership, control, and creative authority. We exist to amplify,
                not to own.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-24 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04]">
              {[
                { label: "Founded", value: "Independent", sub: "No external ownership" },
                { label: "Artists", value: "7 Active", sub: "Each with a distinct world" },
                { label: "Brand Worlds", value: "5 Imprints", sub: "Fashion · Sound · Publishing · more" },
              ].map((item) => (
                <div key={item.label} className="bg-black p-10 group hover:bg-white/[0.02] transition-colors duration-400">
                  <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-3">
                    {item.label}
                  </p>
                  <p className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                    {item.value}
                  </p>
                  <p className="text-xs text-white/25 leading-relaxed">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
              <div>
                <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-2">
                  Ready to explore?
                </p>
                <p className="text-2xl font-black text-white tracking-tight">
                  Discover the SUMG ecosystem.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/artists"
                  className="inline-flex items-center gap-2 bg-white text-black text-[10px] tracking-[0.25em] uppercase px-7 py-3.5 font-semibold hover:bg-white/90 transition-colors duration-300"
                >
                  Artists
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 border border-white/15 text-white text-[10px] tracking-[0.25em] uppercase px-7 py-3.5 hover:border-white/35 hover:bg-white/[0.03] transition-all duration-300"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
