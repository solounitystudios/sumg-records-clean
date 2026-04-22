import Link from "next/link"
import { createBrand } from "@/app/actions/brands"

export const metadata = { title: "New Brand — SUMG Admin" }

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default function NewBrandPage() {
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
        <h1 className="text-3xl font-semibold">New Brand</h1>
        <p className="mt-1 text-sm text-white/50">Add a brand to the SUMG portfolio.</p>
      </div>

      <form action={createBrand} className="space-y-6">
        <div>
          <label htmlFor="b-name" className={labelClass}>Name</label>
          <input
            id="b-name"
            name="name"
            type="text"
            required
            placeholder="e.g. Woronoff"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="b-slug" className={labelClass}>Slug</label>
          <input
            id="b-slug"
            name="slug"
            type="text"
            required
            placeholder="e.g. woronoff"
            pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers, and hyphens only"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-white/25">Lowercase, hyphens only. Must be unique.</p>
        </div>

        <div>
          <label htmlFor="b-category" className={labelClass}>Category</label>
          <select id="b-category" name="category" defaultValue="Fashion" className={inputClass}>
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
            placeholder="Brand story and identity…"
            className={`${inputClass} resize-y`}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Create Brand
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
