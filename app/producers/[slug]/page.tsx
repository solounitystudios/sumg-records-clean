import { notFound } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { producers } from "@/data/producers";

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return producers.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const producer = producers.find((p) => p.slug === slug);
  return { title: producer ? `${producer.name} — SUMG Records` : "Producer Not Found" };
}

export default async function ProducerPage({ params }: Props) {
  const { slug } = await params;
  const producer = producers.find((p) => p.slug === slug);
  if (!producer) notFound();

  return (
    <>
      <Navbar />
      <main>
        <section className="relative min-h-[50vh] flex flex-col justify-end bg-black border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
            <span className="text-[30vw] font-black text-white/[0.025] tracking-tighter leading-none">{producer.name.charAt(0)}</span>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-40">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">{producer.specialty}</p>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none mb-6">{producer.name}</h1>
            <p className="text-sm text-white/30 tracking-widest">Credits: {producer.credits}</p>
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

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-4">Signature</p>
            <p className="text-xl text-white/60 italic">&ldquo;{producer.signature}&rdquo;</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
