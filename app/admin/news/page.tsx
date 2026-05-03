import Link from "next/link"
import { getNews } from "@/lib/db/news"
import { createNewsItem, deleteNewsItem } from "@/app/actions/news"
import { NewsIngestPanel } from "./NewsIngestPanel"

export const metadata = { title: "News — SUMG Admin" }

const categoryStyle: Record<string, string> = {
  Release:      "bg-emerald-500/12 text-emerald-400 border-emerald-500/20",
  Visual:       "bg-violet-500/12 text-violet-400 border-violet-500/20",
  Announcement: "bg-blue-500/12 text-blue-400 border-blue-500/20",
  Brand:        "bg-amber-500/12 text-amber-400 border-amber-500/20",
  Business:     "bg-slate-500/12 text-slate-400 border-slate-500/20",
}

const inputClass =
  "w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/15 transition-all duration-150"

const labelClass = "block text-[9px] uppercase tracking-[0.25em] text-white/35 mb-2 font-mono"

const categories = ["Release", "Visual", "Announcement", "Brand", "Business"]

export default async function NewsAdminPage() {
  const news     = await getNews()
  const featured = news.filter((n) => n.featured)

  return (
    <main className="px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / Content</p>
        <h1 className="text-3xl font-semibold tracking-tight">News</h1>
        <p className="mt-2 text-sm text-white/40">Label news, announcements, and industry feed ingest.</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-3 mb-10">
        {[
          { label: "Total Items",  value: news.length },
          { label: "Featured",     value: featured.length },
          { label: "Categories",   value: [...new Set(news.map((n) => n.category))].length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/30 mb-2 font-mono">{label}</div>
            <div className="text-2xl font-semibold tabular-nums font-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* Industry feed ingest */}
      <div className="mb-8">
        <NewsIngestPanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* News list */}
        <div className="space-y-2.5">
          {news.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/[0.08] bg-[#0a0c10] p-5 hover:border-white/[0.13] transition-all duration-150"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  <span className={`text-[9px] border px-2 py-0.5 rounded shrink-0 font-mono ${categoryStyle[item.category] ?? "bg-white/5 text-white/35 border-white/10"}`}>
                    {item.category}
                  </span>
                  {item.featured && (
                    <span className="text-[9px] border border-white/[0.1] px-2 py-0.5 rounded shrink-0 font-mono text-white/40">
                      Featured
                    </span>
                  )}
                  <span className="text-[9px] text-white/25 shrink-0 font-mono">{item.date}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/admin/news/${item.id}/edit`}
                    className="text-[10px] font-mono text-white/30 hover:text-white transition-colors duration-150 tracking-wider"
                  >
                    Edit
                  </Link>
                  <form action={deleteNewsItem.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="text-[10px] font-mono text-red-400/35 hover:text-red-400 transition-colors duration-150 tracking-wider"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-[11px] text-white/40 leading-relaxed line-clamp-2">{item.excerpt}</p>
            </div>
          ))}

          {news.length === 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-10 text-center">
              <p className="text-sm text-white/25 font-mono">No news items yet.</p>
              <p className="mt-1 text-xs text-white/15">Use the feed ingest above or create one manually →</p>
            </div>
          )}
        </div>

        {/* Create form */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0c10] p-6 self-start">
          <h2 className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/35 mb-6">New Item</h2>

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
              <select id="n-category" name="category" defaultValue="Announcement" className={`${inputClass} bg-[#0a0c10]`}>
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
              <label htmlFor="n-featured" className="text-xs text-white/50">
                Featured
              </label>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-150 hover:bg-white/90"
            >
              Create Item
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
