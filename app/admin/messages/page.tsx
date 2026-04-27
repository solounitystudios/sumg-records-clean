export const dynamic = "force-dynamic"
export const metadata = { title: "Messages — SUMG Admin" }

import { getThreads } from "@/lib/db/messages"
import { createThread, archiveThread, deleteThread } from "@/app/actions/messages"

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function MessagesPage() {
  const threads = await getThreads()

  const active   = threads.filter((t) => !t.isArchived)
  const archived = threads.filter((t) => t.isArchived)
  const total    = threads.reduce((s, t) => s + (t.messageCount ?? 0), 0)

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Messages</h1>
        <p className="mt-2 text-sm text-white/50">Internal message threads and correspondence.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-10">
        {[
          { label: "Threads",  value: threads.length },
          { label: "Active",   value: active.length },
          { label: "Archived", value: archived.length },
          { label: "Messages", value: total },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8">
                <h2 className="text-sm font-medium">Active Threads</h2>
              </div>
              <div className="divide-y divide-white/5">
                {active.map((t) => (
                  <div key={t.id} className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t.subject}</div>
                      <div className="mt-0.5 text-xs text-white/35 space-x-2">
                        <span>{t.createdBy || "Unknown"}</span>
                        {t.entityType && <span>· {t.entityType}{t.entityId ? `: ${t.entityId}` : ""}</span>}
                        <span>· {relativeDate(t.updatedAt)}</span>
                        {(t.messageCount ?? 0) > 0 && (
                          <span>· {t.messageCount} msg{(t.messageCount ?? 0) !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <form action={archiveThread.bind(null, t.id)}>
                        <button type="submit" className="text-xs text-white/30 hover:text-white/70 transition">
                          Archive
                        </button>
                      </form>
                      <form action={deleteThread.bind(null, t.id)}>
                        <button type="submit" className="text-xs text-red-400/40 hover:text-red-400 transition">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {archived.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-[#0d1016]/60 overflow-hidden opacity-60">
              <div className="px-6 py-4 border-b border-white/5">
                <h2 className="text-sm font-medium text-white/40">Archived Threads ({archived.length})</h2>
              </div>
              <div className="divide-y divide-white/5">
                {archived.map((t) => (
                  <div key={t.id} className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/40">{t.subject}</div>
                      <div className="mt-0.5 text-xs text-white/20">{t.createdBy} · {relativeDate(t.updatedAt)}</div>
                    </div>
                    <form action={deleteThread.bind(null, t.id)}>
                      <button type="submit" className="text-xs text-red-400/30 hover:text-red-400 transition shrink-0">
                        Delete
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}

          {threads.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
              No message threads yet. Start the first one →
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 self-start">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">New Thread</h2>
          <form action={createThread} className="space-y-4">
            <div>
              <label htmlFor="msg-subject" className={labelClass}>Subject</label>
              <input id="msg-subject" name="subject" type="text" required placeholder="Thread subject" className={inputClass} />
            </div>

            <div>
              <label htmlFor="msg-sender" className={labelClass}>From</label>
              <input id="msg-sender" name="created_by" type="text" required placeholder="Your name" className={inputClass} />
            </div>

            <div>
              <label htmlFor="msg-entity-type" className={labelClass}>Related To (optional)</label>
              <select id="msg-entity-type" name="entity_type" defaultValue="" className={inputClass}>
                <option value="">— None —</option>
                <option value="artist">Artist</option>
                <option value="release">Release</option>
                <option value="contract">Contract</option>
                <option value="task">Task</option>
              </select>
            </div>

            <div>
              <label htmlFor="msg-entity-id" className={labelClass}>Entity ID / Slug</label>
              <input id="msg-entity-id" name="entity_id" type="text" placeholder="e.g. zyson or UUID" className={inputClass} />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Start Thread
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
