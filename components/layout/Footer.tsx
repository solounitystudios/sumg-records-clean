import Link from "next/link";

const footerLinks = {
  Music: [
    { label: "Artists", href: "/artists" },
    { label: "Producers", href: "/producers" },
    { label: "Releases", href: "/releases" },
  ],
  Company: [
    { label: "Ecosystem", href: "/ecosystem" },
    { label: "Brands", href: "/brands" },
    { label: "Admin", href: "/admin" },
  ],
  Social: [
    { label: "Instagram", href: "#" },
    { label: "Twitter / X", href: "#" },
    { label: "YouTube", href: "#" },
    { label: "Spotify", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-dark-900 border-t border-gold-600/20 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gold-600 rounded-sm flex items-center justify-center">
                <span className="text-dark-900 font-bold text-sm font-serif">S</span>
              </div>
              <span className="text-xl font-bold font-serif tracking-wider">
                <span className="text-gold-gradient">SUMG</span>
                <span className="text-white ml-1">Records</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              A premier independent music label dedicated to developing world-class artists and producing timeless music.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-4">
                {category}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-gray-400 text-sm hover:text-gold-400 transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} SUMG Records. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs mt-2 md:mt-0">
            Crafted with excellence.
          </p>
        </div>
      </div>
    </footer>
  );
}
