import { notFound } from "next/navigation"
import Link from "next/link"
import { getNews } from "@/lib/db/news"
import { updateNewsItem } from "@/app/actions/news"

export const metadata = { title: "Edit News — SUMG Admin" }

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

const categories = ["Release", "Visual", "Announcement", "Brand", "Business"]

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const news = await getNews()
  const item = news.find((n) => n.id === id)
  if (!item) notFound()

  const action = updateNewsItem.bind(null, id)

  return (
    <main className="px-6 py-10 md:px-10 max-w-xl">
      <div className="mb-10">
        <Link
          href="/admin/news"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← News
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Edit News Item</h1>
      </div>

      <form action={action} className="space-y-6">
        <div>
          <label htmlFor="n-title" className={labelClass}>Title</label>
          <input
            id="n-title"
            name="title"
            type="text"
            required
            defaultValue={item.title}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="n-excerpt" className={labelClass}>Excerpt</label>
          <textarea
            id="n-excerpt"
            name="excerpt"
            rows={4}
            required
            defaultValue={item.excerpt}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div>
          <label htmlFor="n-date" className={labelClass}>Date</label>
          <input
            id="n-date"
            name="date"
            type="date"
            required
            defaultValue={item.date}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="n-category" className={labelClass}>Category</label>
          <select id="n-category" name="category" defaultValue={item.category} className={inputClass}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="n-featured"
            name="featured"
            type="checkbox"
            defaultChecked={item.featured}
            className="rounded border-white/20 bg-white/5 text-white"
          />
          <label htmlFor="n-featured" className="text-sm text-white/60">Featured</label>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-3 text-xs text-white/30">
          Slug <span className="font-mono text-white/50 ml-2">{item.slug}</span> · cannot be changed here
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Save Changes
          </button>
          <Link
            href="/admin/news"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
