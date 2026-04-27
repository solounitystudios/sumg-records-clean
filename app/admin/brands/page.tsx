import Link from "next/link"
import { getBrands } from "@/lib/db/brands"

export const metadata = { title: "Brand System — SUMG Admin" }

const categoryStyle: Record<string, string> = {
  Fashion: "bg-violet-500/15 text-violet-400",
  Streetwear: "bg-orange-500/15 text-orange-400",
  Accessories: "bg-sky-500/15 text-sky-400",
  Footwear: "bg-amber-500/15 text-amber-400",
}

export default async function BrandsAdminPage() {
  const brands = await getBrands()
  const categories = [...new Set(brands.map((b) => b.category))]

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
          <h1 className="text-3xl font-semibold">Brand System</h1>
          <p className="mt-2 text-sm text-white/50">Manage the SUMG brand portfolio.</p>
        </div>
        <Link
          href="/admin/brands/new"
          className="shrink-0 rounded-full border border-white/20 px-5 py-2 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white transition"
        >
          + New Brand
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          { label: "Total Brands", value: brands.length },
          { label: "Categories", value: categories.length },
          { label: "Active", value: brands.filter((b) => b.isActive).length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {brands.map((brand) => (
          <div
            key={brand.slug}
            className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden"
          >
            <div className="flex items-start gap-5 p-6">
              <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-xl font-semibold text-white/60 shrink-0">
                {brand.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-base font-semibold">{brand.name}</h3>
                    <p className="text-xs text-white/35 mt-0.5 italic">&ldquo;{brand.tagline}&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle[brand.category] ?? "bg-white/8 text-white/35"}`}>
                      {brand.category}
                    </span>
                    <Link
                      href={`/admin/brands/${brand.slug}/edit`}
                      className="text-xs text-white/40 hover:text-white transition"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/brands/${brand.slug}`}
                      className="text-xs text-white/40 hover:text-white transition"
                    >
                      Public →
                    </Link>
                  </div>
                </div>

                <p className="mt-3 text-sm text-white/50 leading-6 max-w-2xl line-clamp-2">
                  {brand.description}
                </p>
              </div>
            </div>
          </div>
        ))}

        {brands.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
            No brands yet. Create the first one →
          </div>
        )}
      </div>
    </main>
  )
}
