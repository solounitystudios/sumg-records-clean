import { news } from "@/lib/data"

export const metadata = { title: "News — SUMG Records" }

const categoryStyle: Record<string, string> = {
  Release: "bg-emerald-500/15 text-emerald-400",
  Visual: "bg-violet-500/15 text-violet-400",
  Announcement: "bg-blue-500/15 text-blue-400",
  Brand: "bg-amber-500/15 text-amber-400",
  Business: "bg-slate-500/15 text-slate-400",
}

export default function NewsPage() {
  const featured = news.filter((n) => n.featured)
  const rest = news.filter((n) => !n.featured)

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40 mb-3">Latest</p>
          <h1 className="text-4xl font-semibold md:text-6xl">News</h1>
          <p className="mt-5 max-w-2xl text-base text-white/60 leading-7">
            Releases, visuals, brand drops, and label updates from the SUMG universe.
          </p>
        </div>

        {featured.length > 0 && (
          <div className="mb-10 grid gap-5 md:grid-cols-2">
            {featured.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-white/10 bg-[#0d1016] p-8"
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle[item.category] ?? "bg-white/8 text-white/40"}`}>
                    {item.category}
                  </span>
                  <span className="text-xs text-white/35">{item.date}</span>
                </div>
                <h2 className="text-xl font-semibold leading-snug mb-3">{item.title}</h2>
                <p className="text-sm text-white/55 leading-7">{item.excerpt}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {rest.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-6 rounded-2xl border border-white/10 bg-[#0d1016] px-6 py-5"
            >
              <div className="shrink-0 pt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle[item.category] ?? "bg-white/8 text-white/40"}`}>
                  {item.category}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-white/50 leading-6">{item.excerpt}</p>
              </div>
              <div className="shrink-0 text-xs text-white/35">{item.date}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
