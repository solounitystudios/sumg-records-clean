import { Producer } from "@/data/producers";

interface ProducerCardProps {
  producer: Producer;
  index: number;
}

export function ProducerCard({ producer, index }: ProducerCardProps) {
  return (
    <div className="group relative border-b border-white/5 py-7 px-2 flex items-start gap-6 hover:border-white/10 transition-all duration-300 cursor-pointer">
      {/* Index */}
      <span className="text-[11px] tracking-[0.2em] text-white/15 font-mono mt-1 min-w-[2rem]">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Main content */}
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-lg font-semibold tracking-tight text-white group-hover:text-white/90 transition-colors duration-300">
            {producer.name}
          </h3>
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/25 whitespace-nowrap">
            {producer.specialty}
          </span>
        </div>

        <p className="text-xs text-white/35 mt-1.5 leading-relaxed">
          {producer.signature}
        </p>

        <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 mt-3">
          Credits: {producer.credits}
        </p>
      </div>

      {/* Hover left accent */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 group-hover:w-px group-hover:h-8 bg-white/20 transition-all duration-300" />
    </div>
  );
}
