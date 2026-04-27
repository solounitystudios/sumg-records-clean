export const dynamic = "force-dynamic"
export const metadata = { title: "Documents — SUMG Admin" }

import { getDocuments, DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } from "@/lib/db/documents"
import { createDocument, deleteDocument } from "@/app/actions/documents"

const statusStyle: Record<string, string> = {
  active:       "bg-emerald-500/15 text-emerald-400",
  signed:       "bg-emerald-500/15 text-emerald-400",
  pending:      "bg-amber-500/15 text-amber-400",
  needs_review: "bg-amber-500/15 text-amber-400",
  expired:      "bg-white/5 text-white/25",
  archived:     "bg-white/5 text-white/25",
  rejected:     "bg-red-500/15 text-red-400",
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

function fmtLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

function fmtBytes(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocumentsPage() {
  const docs = await getDocuments()

  const active = docs.filter((d) => d.status === "active" || d.status === "signed").length
  const needsReview = docs.filter((d) => d.status === "needs_review" || d.status === "pending").length

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Documents</h1>
        <p className="mt-2 text-sm text-white/50">Contracts, releases, legal files, and label documents.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-10">
        {[
          { label: "Total",        value: docs.length },
          { label: "Active",       value: active },
          { label: "Needs Review", value: needsReview },
          { label: "Categories",   value: new Set(docs.map((d) => d.category)).size },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {docs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
              No documents yet. Add the first one →
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="text-sm font-medium">All Documents</h2>
                <span className="text-xs text-white/35">{docs.length} records</span>
              </div>
              <div className="divide-y divide-white/5">
                {docs.map((d) => (
                  <div key={d.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[d.status] ?? "bg-white/8 text-white/40"}`}>
                            {d.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/30">
                            {d.category}
                          </span>
                          <span className="text-sm font-medium">{d.title}</span>
                        </div>
                        <div className="text-xs text-white/35 space-x-3">
                          {d.artistSlug && <span>{d.artistSlug}</span>}
                          {d.fileName && <span className="font-mono">{d.fileName}</span>}
                          {d.fileSize != null && <span>{fmtBytes(d.fileSize)}</span>}
                          {d.fileUrl && (
                            <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition">
                              Open ↗
                            </a>
                          )}
                        </div>
                        {d.description && (
                          <p className="mt-1 text-xs text-white/30 line-clamp-1">{d.description}</p>
                        )}
                      </div>
                      <form action={deleteDocument.bind(null, d.id)}>
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
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">Add Document</h2>
          <form action={createDocument} className="space-y-4">
            <div>
              <label htmlFor="doc-title" className={labelClass}>Title</label>
              <input id="doc-title" name="title" type="text" required placeholder="Document title" className={inputClass} />
            </div>

            <div>
              <label htmlFor="doc-category" className={labelClass}>Category</label>
              <select id="doc-category" name="category" defaultValue="other" className={inputClass}>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{fmtLabel(c)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="doc-status" className={labelClass}>Status</label>
              <select id="doc-status" name="status" defaultValue="active" className={inputClass}>
                {DOCUMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{fmtLabel(s)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="doc-artist" className={labelClass}>Artist Slug</label>
              <input id="doc-artist" name="artist_slug" type="text" placeholder="e.g. zyson" className={inputClass} />
            </div>

            <div>
              <label htmlFor="doc-release" className={labelClass}>Release Slug</label>
              <input id="doc-release" name="release_slug" type="text" placeholder="e.g. voltage-ep" className={inputClass} />
            </div>

            <div>
              <label htmlFor="doc-url" className={labelClass}>File URL</label>
              <input id="doc-url" name="file_url" type="url" placeholder="https://…" className={inputClass} />
            </div>

            <div>
              <label htmlFor="doc-fname" className={labelClass}>File Name</label>
              <input id="doc-fname" name="file_name" type="text" placeholder="e.g. contract.pdf" className={inputClass} />
            </div>

            <div>
              <label htmlFor="doc-desc" className={labelClass}>Description</label>
              <textarea id="doc-desc" name="description" rows={2} placeholder="Internal notes…" className={`${inputClass} resize-none`} />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Add Document
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
