export const dynamic = "force-dynamic"
export const metadata = { title: "Publishing — SUMG Admin" }

import { getPublishingWorks, PRO_OPTIONS } from "@/lib/db/publishing"
import { createPublishingWork, deletePublishingWork } from "@/app/actions/publishing"

const statusStyle: Record<string, string> = {
  unregistered: "bg-white/8 text-white/40",
  pending:      "bg-amber-500/15 text-amber-400",
  registered:   "bg-emerald-500/15 text-emerald-400",
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default async function PublishingPage() {
  const works = await getPublishingWorks()

  const byStatus = {
    unregistered: works.filter((w) => w.status === "unregistered").length,
    pending:      works.filter((w) => w.status === "pending").length,
    registered:   works.filter((w) => w.status === "registered").length,
  }

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Publishing</h1>
        <p className="mt-2 text-sm text-white/50">Publishing works, PRO registration, and splits.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-10">
        {[
          { label: "Total Works",   value: works.length },
          { label: "Registered",    value: byStatus.registered },
          { label: "Pending",       value: byStatus.pending },
          { label: "Unregistered",  value: byStatus.unregistered },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {works.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
              No publishing works yet. Register the first one →
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-sm font-medium">All Works</h2>
                <span className="text-xs text-white/35">{works.length} records</span>
              </div>
              <div className="divide-y divide-white/5">
                {works.map((w) => (
                  <div key={w.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[w.status] ?? statusStyle.unregistered}`}>
                            {w.status}
                          </span>
                          <span className="text-sm font-medium">{w.title}</span>
                        </div>
                        <div className="text-xs text-white/35 space-x-3">
                          {w.artistSlug && <span>{w.artistSlug}</span>}
                          {w.pro && <span>PRO: {w.pro}</span>}
                          {w.iswc && <span className="font-mono">{w.iswc}</span>}
                        </div>
                        {w.writers.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {w.writers.map((writer) => (
                              <span key={writer} className="text-[10px] px-2 py-0.5 rounded border border-white/8 text-white/40">
                                {writer}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <form action={deletePublishingWork.bind(null, w.id)}>
                        <button type="submit" className="text-xs text-red-400/40 hover:text-red-400 transition shrink-0">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 self-start">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">Register Work</h2>
          <form action={createPublishingWork} className="space-y-4">
            <div>
              <label htmlFor="pw-title" className={labelClass}>Title</label>
              <input id="pw-title" name="title" type="text" required placeholder="Song title" className={inputClass} />
            </div>

            <div>
              <label htmlFor="pw-artist" className={labelClass}>Artist Slug</label>
              <input id="pw-artist" name="artist_slug" type="text" placeholder="e.g. zyson" className={inputClass} />
            </div>

            <div>
              <label htmlFor="pw-release" className={labelClass}>Release Slug</label>
              <input id="pw-release" name="release_slug" type="text" placeholder="e.g. voltage-ep" className={inputClass} />
            </div>

            <div>
              <label htmlFor="pw-pro" className={labelClass}>PRO</label>
              <select id="pw-pro" name="pro" defaultValue="" className={inputClass}>
                <option value="">— None —</option>
                {PRO_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pw-iswc" className={labelClass}>ISWC (optional)</label>
              <input id="pw-iswc" name="iswc" type="text" placeholder="T-000.000.000-0" className={inputClass} />
            </div>

            <div>
              <label htmlFor="pw-status" className={labelClass}>Status</label>
              <select id="pw-status" name="status" defaultValue="unregistered" className={inputClass}>
                <option value="unregistered">Unregistered</option>
                <option value="pending">Pending</option>
                <option value="registered">Registered</option>
              </select>
            </div>

            <div>
              <label htmlFor="pw-notes" className={labelClass}>Notes</label>
              <textarea id="pw-notes" name="notes" rows={2} placeholder="Internal notes…" className={`${inputClass} resize-none`} />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Register Work
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
