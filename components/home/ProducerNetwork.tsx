import { CMSProducer } from "@/lib/types";
import { ProducerCard } from "@/components/cards/ProducerCard";

interface Props {
  producers: CMSProducer[];
}

export function ProducerNetwork({ producers }: Props) {
  return (
    <section
      id="producers"
      className="py-28 border-t border-white/5"
      style={{
        background:
          "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          {/* Left: section label */}
          <div className="lg:col-span-2">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 mb-3">
              Behind the Sound
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none mb-6">
              Producer
              <br />
              <span className="text-white/40">Network</span>
            </h2>
            <p className="text-sm text-white/30 leading-relaxed max-w-[260px]">
              The architects of the SUMG sound — producers who build the sonic
              world our artists inhabit.
            </p>

            {/* Decorative element */}
            <div className="mt-12 hidden lg:block">
              <div className="w-16 h-px bg-white/10 mb-3" />
              <p className="text-[9px] tracking-[0.25em] uppercase text-white/15">
                {producers.length} Active Producers
              </p>
            </div>
          </div>

          {/* Right: producer list */}
          <div className="lg:col-span-3">
            <div className="border-t border-white/5">
              {producers.map((producer, i) => (
                <ProducerCard key={producer.id} producer={producer} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
