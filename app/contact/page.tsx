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
