import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ProducerCard } from "@/components/cards/ProducerCard";
import { getAllProducers } from "@/lib/cms";

export const metadata = { title: "Producers — SUMG Records" };

export default async function ProducersPage() {
  const producers = await getAllProducers();
  return (
    <>
      <Navbar />
      <main>
        <section className="pt-32 pb-16 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">Behind the Sound</p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none">Producers</h1>
          </div>
        </section>
        <section className="py-20 max-w-7xl mx-auto px-6 lg:px-10">
          {producers.length === 0 && (
            <p className="text-white/20 italic text-sm">No producers yet.</p>
          )}
          <div className="border-t border-white/5">
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
