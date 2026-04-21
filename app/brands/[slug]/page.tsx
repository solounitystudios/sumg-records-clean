import { notFound } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { BrandHero } from "@/components/brand-themes/BrandHero";
import { getAllBrands, getBrandBySlug } from "@/lib/cms";
import { getBrandTheme } from "@/lib/brands";
import Link from "next/link";

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await getAllBrands()).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  return { title: brand ? `${brand.name} — SUMG Records` : "Brand Not Found" };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const [brand, allBrands] = await Promise.all([
    getBrandBySlug(slug),
    getAllBrands(),
  ]);
  if (!brand || !brand.isActive) notFound();

  const theme = getBrandTheme(slug);

  return (
    <div className={theme.backgroundStyle} style={{ minHeight: "100vh" }}>
      <Navbar />

      {/* Brand hero — fully distinct per brand */}
      <BrandHero brand={brand} theme={theme} />

      {/* Brand body — also themed */}
      <section className={`py-24 border-t ${theme.borderStyle}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">

            {/* Left: info */}
            <div>
              <p className="text-[9px] tracking-[0.4em] uppercase mb-4" style={{ color: theme.accentColorHex, opacity: 0.6 }}>
                {brand.category}
              </p>
              <h2 className={`text-3xl mb-4 ${theme.headingClassName}`}>About</h2>
              <p className={theme.bodyClassName}>{brand.longDescription ?? brand.descriptor}</p>
              {brand.manifesto && (
                <blockquote className={`mt-6 pl-4 border-l-2 ${theme.bodyClassName} italic`}
                  style={{ borderColor: theme.accentColorHex, opacity: 0.7 }}>
                  {brand.manifesto}
                </blockquote>
              )}
            </div>

            {/* Right: tagline + campaign status + collection */}
            <div className="lg:col-span-2 flex flex-col justify-between gap-12">
              <div className={`p-8 ${theme.surfaceClassName}`}>
                <p className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: theme.accentColorHex, opacity: 0.5 }}>
                  Identity
                </p>
                <p className={`text-2xl ${theme.headingClassName}`}>&ldquo;{brand.tagline}&rdquo;</p>
              </div>

              {/* Campaign status + collection */}
              {(brand.campaignStatus || brand.collectionName) && (
                <div className={`p-6 ${theme.surfaceClassName} space-y-3`}>
                  {brand.campaignStatus && (
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[9px] tracking-[0.3em] uppercase px-2 py-1 ${
                          brand.campaignStatus === "active"
                            ? "bg-green-500/10 text-green-400"
                            : brand.campaignStatus === "upcoming"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-white/5 text-white/30"
                        }`}
                      >
                        {brand.campaignStatus}
                      </span>
                      <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: theme.accentColorHex, opacity: 0.5 }}>
                        Campaign
                      </span>
                    </div>
                  )}
                  {brand.collectionName && (
                    <p className={`text-sm ${theme.headingClassName}`}>
                      {brand.collectionName}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Link href="/contact" className={`inline-flex ${theme.buttonVariant} transition-all duration-300`}>
                  Enquire
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand navigation to other brands */}
      <section className={`py-12 border-t ${theme.borderStyle}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[9px] tracking-[0.4em] uppercase mb-6" style={{ color: theme.accentColorHex, opacity: 0.4 }}>Other Worlds</p>
          <div className="flex flex-wrap gap-4">
            {allBrands.filter((b) => b.slug !== slug && b.isActive).map((b) => (
              <a
                key={b.id}
                href={`/brands/${b.slug}`}
                className="text-[10px] tracking-[0.2em] uppercase transition-all duration-300 hover:opacity-90"
                style={{ color: theme.accentColorHex, opacity: 0.4 }}
              >
                {b.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
