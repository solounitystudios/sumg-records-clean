import { notFound } from "next/navigation"
import Link from "next/link"
import { brands, getBrand } from "@/lib/data"

export async function generateStaticParams() {
  return brands.map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = getBrand(slug)
  if (!brand) return { title: "Brand Not Found — SUMG Records" }
  return { title: `${brand.name} — SUMG Records` }
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = getBrand(slug)
  if (!brand) notFound()

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <Link
          href="/brands"
          className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white transition"
        >
          ← All Brands
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40 mb-3">{brand.category}</p>
            <h1 className="text-5xl font-semibold md:text-7xl">{brand.name}</h1>
            <p className="mt-4 text-lg italic text-white/50">&ldquo;{brand.tagline}&rdquo;</p>
            <p className="mt-8 text-base leading-8 text-white/65 max-w-2xl">{brand.description}</p>

            <div className="mt-10 flex flex-wrap gap-4">
              <button className="rounded-full border border-white bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90">
                Shop Collection
              </button>
              <button className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/5">
                Lookbook
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 aspect-square flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-semibold mb-2">{brand.name.charAt(0)}</p>
                <p className="text-xs uppercase tracking-[0.3em] text-white/30">{brand.name}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35 mb-3">Brand Details</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Category</span>
                  <span className="text-white/80">{brand.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">House</span>
                  <span className="text-white/80">SUMG Records</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Status</span>
                  <span className="text-emerald-400 text-xs px-2 py-0.5 bg-emerald-500/10 rounded-full">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
