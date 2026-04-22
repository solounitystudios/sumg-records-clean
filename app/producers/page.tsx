import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ProducerCard } from "@/components/cards/ProducerCard";
import { getAllProducers } from "@/lib/cms";

export const metadata = {
  title: "Producers",
  description:
    "Meet the producer network behind SUMG Records — five architects of sound building environments for the artists they serve.",
  openGraph: {
    title: "Producers — SUMG Records",
    description:
      "Meet the producer network behind SUMG Records — five architects of sound building environments for the artists they serve.",
  },
};

export default async function ProducersPage() {
  const producers = await getAllProducers();
  return (
    <>
      <Navbar />
      <main>
        {/* Page hero */}
        <section className="relative pt-36 pb-20 border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-end pr-10 select-none pointer-events-none overflow-hidden">
            <span className="text-[15vw] font-black text-white/[0.018] tracking-tighter leading-none">
              PRODUCERS
            </span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
                  Behind the Sound
                </p>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">
                  Producers
                </h1>
              </div>
              <p className="hidden md:block text-xs text-white/25 max-w-[200px] text-right leading-relaxed">
                The architects of the SUMG sound.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 max-w-7xl mx-auto px-6 lg:px-10">
          {producers.length === 0 && (
            <p className="text-white/20 italic text-sm">No producers yet.</p>
          )}
          <div className="border-t border-white/5 max-w-3xl">
            {producers.map((producer, i) => (
              <a key={producer.id} href={`/producers/${producer.slug}`} className="block">
                <ProducerCard producer={producer} index={i} />
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
