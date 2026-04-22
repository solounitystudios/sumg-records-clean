const pillars = [
  {
    number: "01",
    title: "Artist Development",
    description:
      "We build artists for longevity — not trends. Every signing is a long-term investment in vision, craft, and cultural impact.",
  },
  {
    number: "02",
    title: "Sound Architecture",
    description:
      "Our producer network doesn't just make beats — they construct worlds. Every SUMG release is engineered with intention.",
  },
  {
    number: "03",
    title: "Brand Extension",
    description:
      "Music is the entry point. SUMG expands into fashion, film, publishing, and beyond — a full-spectrum creative ecosystem.",
  },
  {
    number: "04",
    title: "Cultural Ownership",
    description:
      "We are independent by design. Artists own their voice, their masters, and their narrative. No compromises.",
  },
];

export function VisionSection() {
  return (
    <section
      id="vision"
      className="py-32 border-t border-white/5 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #111 0%, #000 100%)" }}
    >
      {/* Background text watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[20vw] font-black text-white/[0.015] tracking-tighter leading-none whitespace-nowrap">
          SUMG
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
            Why We Exist
          </p>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none mb-6">
            The SUMG
            <br />
            <span className="text-white/30">Vision</span>
          </h2>
          <p className="text-sm text-white/35 max-w-[500px] mx-auto leading-relaxed">
            SUMG Records is not a label. It is an architecture — a system built
            to elevate sound, protect artists, and redefine what independence
            looks like at the top.
          </p>
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04]">
          {pillars.map((pillar) => (
            <div
              key={pillar.number}
              className="group bg-black p-8 hover:bg-white/[0.02] transition-colors duration-300 cursor-pointer"
            >
              {/* Hover top accent line */}
              <div className="absolute top-0 left-0 w-0 h-px bg-white/25 group-hover:w-full transition-all duration-500" />
              <p className="text-[11px] font-mono text-white/15 mb-6 tracking-[0.15em]">
                {pillar.number}
              </p>
              <h3 className="text-lg font-bold tracking-tight text-white mb-4 group-hover:text-white transition-colors duration-300">
                {pillar.title}
              </h3>
              <p className="text-xs text-white/35 leading-relaxed group-hover:text-white/50 transition-colors duration-300">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom statement */}
        <div className="mt-20 text-center">
          <div className="inline-block border border-white/10 px-10 py-6 hover:border-white/20 transition-colors duration-300">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/25 mb-2">
          <a
            href="/about"
            className="inline-flex flex-col items-center gap-2 border border-white/10 px-10 py-7 hover:border-white/25 hover:bg-white/[0.02] transition-all duration-300 group"
          >
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/25 mb-1 group-hover:text-white/40 transition-colors duration-300">
              Est. Independent
            </p>
            <p className="text-2xl font-black tracking-tight text-white">
              Built to Last.
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 mt-1 group-hover:text-white/40 transition-colors duration-300">
              Our Story →
            </p>
          </a>
        </div>
      </div>
    </section>
  );
}
