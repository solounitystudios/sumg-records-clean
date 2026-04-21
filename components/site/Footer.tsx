const footerLinks = {
  Label: [
    { label: "Artists", href: "/artists" },
    { label: "Releases", href: "/releases" },
    { label: "Songs", href: "/songs" },
    { label: "Producers", href: "/producers" },
  ],
  Worlds: [
    { label: "Woronoff", href: "/brands/woronoff" },
    { label: "Unity Standard", href: "/brands/unity-standard" },
    { label: "Moon Spell", href: "/brands/moon-spell" },
    { label: "Concrete Borough", href: "/brands/concrete-borough" },
    { label: "Salt Current", href: "/brands/salt-current" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Press", href: "mailto:press@sumgrecords.com" },
    { label: "Publishing", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-black mt-0">
      {/* Top CTA strip */}
      <div className="border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-1.5">
              Independent · By Design
            </p>
            <p className="text-xl font-black tracking-tight text-white">
              Building the future of independent music.
            </p>
          </div>
          <a
            href="/contact"
            className="shrink-0 inline-flex items-center gap-3 border border-white/15 text-white text-[10px] tracking-[0.25em] uppercase px-7 py-3.5 hover:border-white/35 hover:bg-white/[0.04] transition-all duration-300"
          >
            Get in Touch
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">
          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="text-white font-black tracking-[0.12em] uppercase text-sm mb-1">
              SUMG
            </div>
            <div className="text-white/25 font-light tracking-widest text-xs mb-5">
              RECORDS
            </div>
            <p className="text-xs text-white/30 leading-relaxed max-w-[200px] mb-6">
              A premium independent label building artists, sound, and culture
              from the ground up.
            </p>
            {/* Social placeholder */}
            <div className="flex gap-4">
              {["IG", "SC", "SP"].map((s) => (
                <span
                  key={s}
                  className="text-[9px] tracking-[0.2em] text-white/15 hover:text-white/50 transition-colors duration-300 cursor-pointer uppercase"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-5">
                {category}
              </p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-white/35 hover:text-white/80 transition-colors duration-300 tracking-wide"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.05] pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-[10px] tracking-[0.15em] text-white/15 uppercase">
            &copy; {new Date().getFullYear()} SUMG Records. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Publishing"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-[10px] tracking-[0.15em] uppercase text-white/15 hover:text-white/40 transition-colors duration-300"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
