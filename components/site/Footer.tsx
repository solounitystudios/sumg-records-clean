const footerLinks = {
  Label: [
    { label: "Artists", href: "#artists" },
    { label: "Releases", href: "#releases" },
    { label: "Producers", href: "#producers" },
  ],
  Worlds: [
    { label: "Woronoff", href: "#brands" },
    { label: "Unity Standard", href: "#brands" },
    { label: "Moon Spell", href: "#brands" },
    { label: "Concrete Borough", href: "#brands" },
    { label: "Salt Current", href: "#brands" },
  ],
  Company: [
    { label: "Vision", href: "#vision" },
    { label: "Contact", href: "mailto:contact@sumgrecords.com" },
    { label: "Press", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black mt-0">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="text-white font-black tracking-[0.12em] uppercase text-sm mb-4">
              SUMG
              <span className="text-white/30 font-light tracking-widest ml-1.5 text-xs block mt-0.5">
                RECORDS
              </span>
            </div>
            <p className="text-xs text-white/30 leading-relaxed max-w-[180px]">
              A premium independent label building artists, sound, and culture
              from the ground up.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/20 mb-5">
                {category}
              </p>
              <ul className="space-y-0">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="block py-1.5 text-xs text-white/40 hover:text-white/80 transition-colors duration-300 tracking-wide"
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
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-[10px] tracking-[0.15em] text-white/30 uppercase">
            &copy; {new Date().getFullYear()} SUMG Records. All rights reserved.
          </p>
          <div className="flex gap-4">
            {["Privacy", "Terms", "Publishing"].map((item) => (
              <a
                key={item}
                href="#"
                className="block py-2 text-[10px] tracking-[0.15em] uppercase text-white/30 hover:text-white/60 transition-colors duration-300"
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
