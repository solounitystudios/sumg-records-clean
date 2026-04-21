import { notFound } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getAllProducers, getProducerBySlug } from "@/lib/cms";

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await getAllProducers()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const producer = await getProducerBySlug(slug);
  return { title: producer ? `${producer.name} — SUMG Records` : "Producer Not Found" };
}

export default async function ProducerPage({ params }: Props) {
  const { slug } = await params;
  const producer = await getProducerBySlug(slug);
  if (!producer) notFound();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative min-h-[55vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
            <span className="text-[30vw] font-black text-white/[0.025] tracking-tighter leading-none">
              {producer.name.charAt(0)}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          {/* Breadcrumb */}
          <div className="absolute top-24 left-0 right-0 z-10">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <a href="/producers" className="text-[10px] tracking-[0.25em] uppercase text-white/25 hover:text-white/60 transition-colors duration-300">
                ← Producers
              </a>
            </div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-24 pt-44">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/30 mb-3">{producer.specialty}</p>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none mb-6">{producer.name}</h1>
            <p className="text-sm text-white/30 tracking-widest max-w-sm">Credits: {producer.credits}</p>
          </div>
        </section>

        {producer.bio && (
          <section className="py-20 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="max-w-2xl">
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">Profile</p>
                <p className="text-base text-white/50 leading-loose">{producer.bio}</p>
              </div>
            </div>
          </section>
        )}

        <section className="py-20 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">Signature Sound</p>
            <blockquote className="border-l-2 border-white/10 pl-6">
              <p className="text-xl md:text-2xl text-white/55 italic leading-relaxed max-w-xl">&ldquo;{producer.signature}&rdquo;</p>
            </blockquote>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between">
            <a
              href="/producers"
              className="text-[10px] tracking-[0.25em] uppercase text-white/25 hover:text-white transition-colors duration-300"
            >
              ← All Producers
            </a>
            <a
              href="/releases"
              className="text-[10px] tracking-[0.25em] uppercase text-white/25 hover:text-white transition-colors duration-300"
            >
              See Releases →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
