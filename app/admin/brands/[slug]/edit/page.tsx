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

const sectionClass = "space-y-6 rounded-2xl border border-white/8 bg-white/[0.02] p-6"

export default async function EditBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) notFound()

  const action = updateBrand.bind(null, slug)

  return (
    <main className="px-6 py-10 md:px-10 max-w-2xl">
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

      <form action={action} className="space-y-8">

        {/* Identity */}
        <div className={sectionClass}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 -mb-2">Identity</p>

          <div>
            <label htmlFor="b-name" className={labelClass}>Name</label>
            <input id="b-name" name="name" type="text" required defaultValue={brand.name} className={inputClass} />
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
              defaultValue={brand.tagline ?? ""}
              placeholder="e.g. Precision over everything."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="b-descriptor" className={labelClass}>Description</label>
            <textarea
              id="b-descriptor"
              name="descriptor"
              rows={4}
              defaultValue={brand.description ?? ""}
              className={`${inputClass} resize-y`}
            />
          </div>

          <div>
            <label htmlFor="b-manifesto" className={labelClass}>Manifesto</label>
            <textarea
              id="b-manifesto"
              name="manifesto"
              rows={3}
              defaultValue={brand.manifesto ?? ""}
              placeholder="Brand philosophy or manifesto statement…"
              className={`${inputClass} resize-y`}
            />
            <p className="mt-1 text-xs text-white/25">Displayed as a pull-quote on the brand page.</p>
          </div>

          <div>
            <label htmlFor="b-accent" className={labelClass}>Accent Color</label>
            <div className="flex gap-3 items-center">
              <input
                id="b-accent"
                name="accentColor"
                type="color"
                defaultValue={brand.accentColor ?? "#ffffff"}
                className="h-11 w-14 rounded-lg border border-white/15 bg-white/5 cursor-pointer p-1"
              />
              <input
                name="accentColorHex"
                type="text"
                defaultValue={brand.accentColor ?? ""}
                placeholder="#ffffff"
                pattern="^#[0-9a-fA-F]{6}$"
                className={`${inputClass} font-mono`}
              />
            </div>
            <p className="mt-1 text-xs text-white/25">6-digit hex used for brand theme on the public page.</p>
          </div>
        </div>

        {/* Media */}
        <div className={sectionClass}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 -mb-2">Media</p>

          <div>
            <label htmlFor="b-logo" className={labelClass}>Logo URL</label>
            <input
              id="b-logo"
              name="logoUrl"
              type="url"
              defaultValue={brand.logoUrl ?? ""}
              placeholder="https://…"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="b-hero" className={labelClass}>Hero Image URL</label>
            <input
              id="b-hero"
              name="heroImageUrl"
              type="url"
              defaultValue={brand.heroImageUrl ?? ""}
              placeholder="https://…"
              className={inputClass}
            />
          </div>
        </div>

        {/* Commerce */}
        <div className={sectionClass}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 -mb-2">Commerce</p>

          <div>
            <label htmlFor="b-shopify" className={labelClass}>Shopify URL</label>
            <input
              id="b-shopify"
              name="shopifyUrl"
              type="url"
              defaultValue={brand.shopifyUrl ?? ""}
              placeholder="https://sumgrecords.myshopify.com/collections/…"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="b-collection" className={labelClass}>Collection Name</label>
            <input
              id="b-collection"
              name="collectionName"
              type="text"
              defaultValue={brand.collectionName ?? ""}
              placeholder="e.g. SS26 Drop"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="b-campaign" className={labelClass}>Campaign Status</label>
            <select
              id="b-campaign"
              name="campaignStatus"
              defaultValue={brand.campaignStatus ?? ""}
              className={inputClass}
            >
              <option value="">None</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>

        {/* Visibility */}
        <div className={sectionClass}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 -mb-2">Visibility</p>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={brand.isActive}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-white"
            />
            <span className="text-sm text-white/70">Brand is active (visible on public site)</span>
          </label>
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
