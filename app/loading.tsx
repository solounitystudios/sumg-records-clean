export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="text-white font-black tracking-[0.12em] uppercase text-sm">
          SUMG
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-white/30 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
