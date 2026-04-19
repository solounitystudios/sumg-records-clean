import { BrandTheme, CMSBrand } from "@/lib/types";

interface BrandHeroProps {
  brand: CMSBrand;
  theme: BrandTheme;
}

export function BrandHero({ brand, theme }: BrandHeroProps) {
  switch (theme.heroStyle) {
    case "editorial":
      return <EditorialHero brand={brand} theme={theme} />;
    case "minimal":
      return <MinimalHero brand={brand} theme={theme} />;
    case "mystic":
      return <MysticHero brand={brand} theme={theme} />;
    case "industrial":
      return <IndustrialHero brand={brand} theme={theme} />;
    case "coastal":
      return <CoastalHero brand={brand} theme={theme} />;
    default:
      return <EditorialHero brand={brand} theme={theme} />;
  }
}

function EditorialHero({ brand, theme }: BrandHeroProps) {
  return (
    <div className={`min-h-[70vh] flex flex-col justify-end ${theme.backgroundStyle} border-b ${theme.borderStyle}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-20 pt-40 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-end">
          <div>
            <div className="w-12 h-px bg-zinc-600 mb-8" />
            <p className="text-[9px] tracking-[0.5em] uppercase text-zinc-500 mb-4">{brand.category}</p>
            <h1 className={`text-7xl md:text-9xl leading-none mb-0 ${theme.headingClassName}`} style={{ letterSpacing: "-0.04em" }}>
              {brand.name}
            </h1>
          </div>
          <div className="lg:pb-2">
            <p className={`text-base mb-8 ${theme.bodyClassName}`}>{brand.longDescription ?? brand.descriptor}</p>
            <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 italic">&ldquo;{brand.tagline}&rdquo;</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MinimalHero({ brand, theme }: BrandHeroProps) {
  return (
    <div className={`min-h-[60vh] flex flex-col justify-center ${theme.backgroundStyle} border-b ${theme.borderStyle} relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 60px), repeating-linear-gradient(0deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 60px)" }} />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-32 w-full relative z-10">
        <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-sky-500/60 mb-6">
          {`// ${brand.slug.toUpperCase()}.SYSTEM`}
        </p>
        <h1 className={`text-5xl md:text-8xl leading-none mb-6 ${theme.headingClassName}`}>
          {brand.name}
        </h1>
        <p className={`max-w-xl ${theme.bodyClassName} mb-8`}>{brand.descriptor}</p>
        <p className="text-[9px] font-mono text-sky-900 tracking-[0.3em]">STATUS: ACTIVE / {brand.category.toUpperCase()}</p>
      </div>
    </div>
  );
}

function MysticHero({ brand, theme }: BrandHeroProps) {
  return (
    <div className={`min-h-[80vh] flex flex-col justify-center ${theme.backgroundStyle} relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-40 w-full relative z-10 text-center">
        <p className="text-[10px] tracking-[0.5em] uppercase text-violet-600/60 mb-8">{brand.category}</p>
        <h1 className={`text-6xl md:text-9xl leading-none mb-8 ${theme.headingClassName}`}>
          {brand.name}
        </h1>
        <div className="w-px h-16 bg-violet-800/40 mx-auto mb-8" />
        <p className={`max-w-lg mx-auto ${theme.bodyClassName} mb-8`}>{brand.descriptor}</p>
        <p className="text-[11px] tracking-[0.3em] text-violet-500/40 italic">{brand.tagline}</p>
      </div>
    </div>
  );
}

function IndustrialHero({ brand, theme }: BrandHeroProps) {
  return (
    <div className={`min-h-[65vh] flex flex-col justify-end ${theme.backgroundStyle} border-b-4 ${theme.borderStyle} relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23fff' fill-opacity='1'/%3E%3C/svg%3E\")" }} />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16 pt-40 w-full relative z-10">
        <p className="text-[9px] tracking-[0.6em] uppercase text-stone-600 mb-4">{brand.category}</p>
        <h1 className={`text-6xl md:text-[10rem] leading-none mb-4 ${theme.headingClassName}`} style={{ letterSpacing: "0.02em" }}>
          {brand.name.split(" ").map((word, i) => (
            <span key={i} className="block">{word}</span>
          ))}
        </h1>
        <p className={`max-w-md mt-8 ${theme.bodyClassName}`}>{brand.descriptor}</p>
      </div>
    </div>
  );
}

function CoastalHero({ brand, theme }: BrandHeroProps) {
  return (
    <div className={`min-h-[75vh] flex flex-col justify-center ${theme.backgroundStyle} relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(148,163,184,0.04) 0%, transparent 70%)" }} />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-40 w-full relative z-10">
        <div className="max-w-2xl">
          <p className="text-[9px] tracking-[0.6em] uppercase text-slate-600/60 mb-10">{brand.category}</p>
          <h1 className={`text-5xl md:text-8xl leading-none mb-10 ${theme.headingClassName}`}>
            {brand.name}
          </h1>
          <div className="w-24 h-px bg-slate-700/30 mb-8" />
          <p className={`${theme.bodyClassName} mb-6`}>{brand.longDescription ?? brand.descriptor}</p>
          <p className="text-[10px] tracking-[0.4em] uppercase text-slate-600/40">{brand.tagline}</p>
        </div>
      </div>
    </div>
  );
}
