export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse" />
        <p className="text-[9px] tracking-[0.4em] uppercase text-white/20">Loading</p>
      </div>
    </div>
  );
}
