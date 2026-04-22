import Link from "next/link"
import { brands } from "@/lib/data"

export const metadata = { title: "Brands — SUMG Records" }

export default function BrandsPage() {
  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40 mb-3">Brand System</p>
          <h1 className="text-4xl font-semibold md:text-6xl">Fashion and identity</h1>
          <p className="mt-5 max-w-2xl text-base text-white/60 leading-7">
            Five distinct fashion brands operating under the SUMG umbrella. Each has its
            own identity, aesthetic, and cultural position — unified by the same standard
            of intentionality.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="group block rounded-3xl border border-white/10 bg-[#0d1016] overflow-hidden transition hover:border-white/20 hover:bg-[#11151d]"
            >
              <div className="aspect-[16/9] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_50%),linear-gradient(180deg,#11151c,#090b10)] flex items-end p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/35 mb-1">{brand.category}</p>
                  <h2 className="text-xl font-semibold group-hover:text-white/90 transition">{brand.name}</h2>
                </div>
              </div>
              <div className="p-6 border-t border-white/8">
                <p className="text-sm italic text-white/50 mb-3">&ldquo;{brand.tagline}&rdquo;</p>
                <p className="text-sm text-white/50 leading-6 line-clamp-2">{brand.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
