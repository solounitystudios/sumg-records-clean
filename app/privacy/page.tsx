import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export const metadata = { title: "Privacy Policy — SUMG Records" };

export default function PrivacyPage() {
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
              Privacy Policy
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
                SUMG Records (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the
                website sumgrecords.com. This page informs you of our policies
                regarding the collection, use, and disclosure of personal
                information when you use our service.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                Information We Collect
              </h2>
              <p>
                We collect information you voluntarily provide, including your
                email address when you subscribe to our newsletter or submit a
                contact form. We do not sell your personal information to third
                parties.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                How We Use Your Information
              </h2>
              <ul className="space-y-2 list-disc list-inside text-white/40">
                <li>To send updates about new releases, merchandise, and events.</li>
                <li>To respond to enquiries and support requests.</li>
                <li>To improve our website and marketing communications.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                Cookies
              </h2>
              <p>
                Our site uses essential cookies for session management. No
                third-party advertising cookies are used.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                Your Rights
              </h2>
              <p>
                You may unsubscribe from our mailing list at any time by
                contacting us at{" "}
                <a
                  href="mailto:contact@sumgrecords.com"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  contact@sumgrecords.com
                </a>
                . You may also request deletion of your personal data.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-white/70 mb-3">
                Contact
              </h2>
              <p>
                Questions about this policy? Email us at{" "}
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
