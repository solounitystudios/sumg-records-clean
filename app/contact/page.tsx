import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ContactForm } from "@/components/site/ContactForm";

export const metadata = {
  title: "Contact",
  description:
    "Get in touch with SUMG Records for general enquiries, press and media, artist submissions, and brand partnerships.",
  openGraph: {
    title: "Contact — SUMG Records",
    description:
      "Get in touch with SUMG Records for general enquiries, press and media, artist submissions, and brand partnerships.",
  },
};

interface Props {
  searchParams: Promise<{ subject?: string }>;
}

export default async function ContactPage({ searchParams }: Props) {
  const { subject } = await searchParams;

  return (
    <>
      <Navbar />
      <main>
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
                        className="text-sm text-white/55 hover:text-white transition-colors duration-300"
                      >
                        {item.value}
                      </a>
                    </div>
                  ))}
                </div>

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
