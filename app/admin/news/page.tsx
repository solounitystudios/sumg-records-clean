import Link from "next/link"
import { getNews } from "@/lib/db/news"
import { createNewsItem, deleteNewsItem } from "@/app/actions/news"

export const metadata = { title: "News — SUMG Admin" }

const categoryStyle: Record<string, string> = {
  Release: "bg-emerald-500/15 text-emerald-400",
  Visual: "bg-violet-500/15 text-violet-400",
  Announcement: "bg-blue-500/15 text-blue-400",
  Brand: "bg-amber-500/15 text-amber-400",
  Business: "bg-slate-500/15 text-slate-400",
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

const categories = ["Release", "Visual", "Announcement", "Brand", "Business"]

export default async function NewsAdminPage() {
  const news = await getNews()
  const featured = news.filter((n) => n.featured)

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">News</h1>
        <p className="mt-2 text-sm text-white/50">Manage label news and announcements.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          { label: "Total Items", value: news.length },
          { label: "Featured", value: featured.length },
          { label: "Categories", value: [...new Set(news.map((n) => n.category))].length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {news.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-[#0d1016] p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${categoryStyle[item.category] ?? "bg-white/8 text-white/40"}`}>
                    {item.category}
                  </span>
                  {item.featured && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50 shrink-0">
                      Featured
                    </span>
                  )}
                  <span className="text-xs text-white/30 shrink-0">{item.date}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/admin/news/${item.id}/edit`}
                    className="text-xs text-white/40 hover:text-white transition"
                  >
                    Edit
                  </Link>
                  <form action={deleteNewsItem.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="text-xs text-red-400/50 hover:text-red-400 transition"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs text-white/45 leading-5 line-clamp-2">{item.excerpt}</p>
            </div>
          ))}

          {news.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
              No news items yet. Create the first one →
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 self-start">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">New Item</h2>

          <form action={createNewsItem} className="space-y-4">
            <div>
              <label htmlFor="n-title" className={labelClass}>Title</label>
              <input
                id="n-title"
                name="title"
                type="text"
                required
                placeholder="e.g. Zyson Drops New Single"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="n-slug" className={labelClass}>Slug</label>
              <input
                id="n-slug"
                name="slug"
                type="text"
                required
                placeholder="e.g. zyson-new-single"
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="n-excerpt" className={labelClass}>Excerpt</label>
              <textarea
                id="n-excerpt"
                name="excerpt"
                rows={3}
                required
                placeholder="Short description…"
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label htmlFor="n-date" className={labelClass}>Date</label>
              <input
                id="n-date"
                name="date"
                type="date"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="n-category" className={labelClass}>Category</label>
              <select id="n-category" name="category" defaultValue="Announcement" className={inputClass}>
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
                className="rounded border-white/20 bg-white/5 text-white"
              />
              <label htmlFor="n-featured" className="text-sm text-white/60">
                Featured (show prominently on news page)
              </label>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Create Item
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
