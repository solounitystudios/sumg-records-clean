import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export const metadata = { title: "Terms of Use — SUMG Records" };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="pt-32 pb-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
              Legal
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">
              Terms of Use
            </h1>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-3xl mx-auto px-6 lg:px-10 space-y-10 text-sm text-white/45 leading-loose">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 mb-4">
                Last updated: 2025
              </p>
              <p>
                By accessing sumgrecords.com, you agree to be bound by these
                terms of use. If you do not agree, please do not use this site.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                Intellectual Property
              </h2>
              <p>
                All content on this site — including music, artwork, text, and
                brand assets — is the exclusive property of SUMG Records and its
                artists. Reproduction, distribution, or commercial use without
                written permission is prohibited.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                Acceptable Use
              </h2>
              <ul className="space-y-2 list-disc list-inside text-white/40">
                <li>Do not use this site for unlawful purposes.</li>
                <li>Do not scrape, copy, or redistribute our content.</li>
                <li>
                  Do not attempt to gain unauthorized access to any systems.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                Merchandise &amp; Commerce
              </h2>
              <p>
                All sales are final unless the item is defective or incorrectly
                fulfilled. For order issues, contact{" "}
                <a
                  href="mailto:contact@sumgrecords.com"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  contact@sumgrecords.com
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                Limitation of Liability
              </h2>
              <p>
                SUMG Records is not liable for damages arising from your use of
                this website. The site is provided &ldquo;as is&rdquo; without
                warranty of any kind.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                Contact
              </h2>
              <p>
                Questions about these terms? Email{" "}
                <a
                  href="mailto:contact@sumgrecords.com"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  contact@sumgrecords.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
