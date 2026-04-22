import { notFound } from "next/navigation"
import Link from "next/link"
import { getBrandBySlug } from "@/lib/db/brands"
import { updateBrand } from "@/app/actions/brands"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) return { title: "Not Found — SUMG Admin" }
  return { title: `Edit ${brand.name} — SUMG Admin` }
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default async function EditBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) notFound()

  const action = updateBrand.bind(null, slug)

  return (
    <main className="px-6 py-10 md:px-10 max-w-xl">
      <div className="mb-10">
        <Link
          href="/admin/brands"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← Brand System
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Edit Brand</h1>
        <p className="mt-1 text-sm text-white/50">{brand.name}</p>
      </div>

      <form action={action} className="space-y-6">
        <div>
          <label htmlFor="b-name" className={labelClass}>Name</label>
          <input
            id="b-name"
            name="name"
            type="text"
            required
            defaultValue={brand.name}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="b-category" className={labelClass}>Category</label>
          <select id="b-category" name="category" defaultValue={brand.category} className={inputClass}>
            <option value="Fashion">Fashion</option>
            <option value="Streetwear">Streetwear</option>
            <option value="Accessories">Accessories</option>
            <option value="Footwear">Footwear</option>
            <option value="Lifestyle">Lifestyle</option>
          </select>
        </div>

        <div>
          <label htmlFor="b-tagline" className={labelClass}>Tagline</label>
          <input
            id="b-tagline"
            name="tagline"
            type="text"
            defaultValue={brand.tagline}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="b-descriptor" className={labelClass}>Description</label>
          <textarea
            id="b-descriptor"
            name="descriptor"
            rows={5}
            defaultValue={brand.description}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-3 text-xs text-white/30">
          Slug <span className="font-mono text-white/50 ml-2">{brand.slug}</span> · cannot be changed here
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Save Changes
          </button>
          <Link
            href="/admin/brands"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
