import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ContactForm } from "@/components/site/ContactForm";

export const metadata = { title: "Contact — SUMG Records" };

interface Props {
  searchParams: Promise<{ subject?: string }>;
}

export default async function ContactPage({ searchParams }: Props) {
  const { subject } = await searchParams;

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-36 pb-20 border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-end pr-8 select-none pointer-events-none overflow-hidden">
            <span className="text-[16vw] font-black text-white/[0.018] tracking-tighter leading-none">
              CONTACT
            </span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
        <section className="pt-32 pb-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
              Get in Touch
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">
              Contact
            </h1>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">

              {/* Contact info */}
              <div>
                <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-10">
                  Direct Lines
                </p>
                <div className="space-y-10">
                  {[
                    { label: "General Enquiries", value: "contact@sumgrecords.com" },
                    { label: "Press & Media", value: "press@sumgrecords.com" },
                    { label: "Artist Submissions", value: "artists@sumgrecords.com" },
                    { label: "Brand Partnerships", value: "brands@sumgrecords.com" },
                  ].map((item) => (
                    <div key={item.label} className="group">
                      <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-2">
                        {item.label}
                      </p>
                      <a
                        href={`mailto:${item.value}`}
                        className="text-sm text-white/55 hover:text-white transition-colors duration-300 group-hover:underline underline-offset-4 decoration-white/20"
                      >
                        {item.value}
                      </a>
                    </div>
                  ))}
                </div>

                {/* Trust badge */}
                <div className="mt-16 border-t border-white/[0.05] pt-8">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-white/15 mb-2">
                    Response time
                  </p>
                  <p className="text-xs text-white/30 leading-relaxed">
                    We respond to all enquiries within 2–3 business days.
                    Press and submission requests are reviewed weekly.
                  </p>
                </div>
              </div>

              {/* Message form */}
              <div>
                <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-10">
                  Send a Message
                </p>
                <fieldset disabled className="space-y-5 opacity-60 cursor-not-allowed">
                  {["Name", "Email", "Subject"].map((field) => (
                    <div key={field}>
                      <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
                        {field}
                      </label>
                      <input
                        type={field === "Email" ? "email" : "text"}
                        className="w-full bg-transparent border border-white/10 px-4 py-3.5 text-sm text-white placeholder-white/15 focus:border-white/30 focus:outline-none transition-colors duration-300"
                        placeholder={field}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
                      Message
                    </label>
                    <textarea
                      rows={6}
                      className="w-full bg-transparent border border-white/10 px-4 py-3.5 text-sm text-white placeholder-white/15 focus:border-white/30 focus:outline-none transition-colors duration-300 resize-none"
                      placeholder="Your message..."
                    />
                  </div>
                </fieldset>
                <div className="mt-5 flex items-center gap-5">
                  <button
                    type="button"
                    disabled
                    className="border border-white/10 text-white/25 text-[10px] tracking-[0.3em] uppercase px-8 py-3.5 cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                  <p className="text-[9px] text-white/20 leading-relaxed">
                    Use direct email above while this form is being configured.
                  </p>
                </div>
              </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
              {/* Contact info */}
              <div className="space-y-12">
                {[
                  {
                    label: "General Enquiries",
                    value: "contact@sumgrecords.com",
                  },
                  { label: "Press & Media", value: "press@sumgrecords.com" },
                  {
                    label: "Artist Submissions",
                    value: "artists@sumgrecords.com",
                  },
                  {
                    label: "Brand Partnerships",
                    value: "brands@sumgrecords.com",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[9px] tracking-[0.35em] uppercase text-white/20 mb-2">
                      {item.label}
                    </p>
                    <a
                      href={`mailto:${item.value}`}
                      className="text-sm text-white/60 hover:text-white transition-colors duration-300"
                    >
                      {item.value}
                    </a>
                  </div>
                ))}
              </div>

              {/* Live contact form */}
              <ContactForm defaultSubject={subject} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
