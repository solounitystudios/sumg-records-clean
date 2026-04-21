import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export const metadata = { title: "Contact — SUMG Records" };

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="pt-32 pb-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">Get in Touch</p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">Contact</h1>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">

              {/* Contact info */}
              <div className="space-y-12">
                {[
                  { label: "General Enquiries", value: "contact@sumgrecords.com" },
                  { label: "Press & Media", value: "press@sumgrecords.com" },
                  { label: "Artist Submissions", value: "artists@sumgrecords.com" },
                  { label: "Brand Partnerships", value: "brands@sumgrecords.com" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-2">{item.label}</p>
                    <a href={`mailto:${item.value}`} className="text-sm text-white/60 hover:text-white transition-colors duration-300">{item.value}</a>
                  </div>
                ))}
              </div>

              {/* Message form — not yet wired to a submission endpoint.
                  Replace the fieldset + button with a server action before launch. */}
              <div className="space-y-4">
                <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-6">Send a Message</p>
                <fieldset disabled className="space-y-4 opacity-50 cursor-not-allowed">
                {["Name", "Email", "Subject"].map((field) => (
                  <div key={field}>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">{field}</label>
                    <input
                      type={field === "Email" ? "email" : "text"}
                      className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300"
                      placeholder={field}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">Message</label>
                  <textarea
                    rows={6}
                    className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:outline-none transition-colors duration-300 resize-none"
                    placeholder="Your message..."
                  />
                </div>
                </fieldset>
                <button
                  type="button"
                  disabled
                  className="border border-white/10 text-white/25 text-[10px] tracking-[0.3em] uppercase px-8 py-3 cursor-not-allowed"
                >
                  Coming Soon
                </button>
                <p className="text-[9px] text-white/20 pt-1">
                  Direct email above while this form is being configured.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
