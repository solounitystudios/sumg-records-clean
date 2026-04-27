export const dynamic = "force-dynamic"
export const metadata = { title: "Tasks — SUMG Admin" }

import { getTasks, TASK_STATUSES, TASK_PRIORITIES } from "@/lib/db/tasks"
import { createTask, deleteTask } from "@/app/actions/tasks"

const statusStyle: Record<string, string> = {
  open:        "bg-blue-500/15 text-blue-400",
  in_progress: "bg-amber-500/15 text-amber-400",
  blocked:     "bg-red-500/15 text-red-400",
  done:        "bg-white/5 text-white/25",
}

const priorityStyle: Record<string, string> = {
  low:    "text-white/30",
  medium: "text-white/55",
  high:   "text-amber-400",
  urgent: "text-red-400",
}

const priorityDot: Record<string, string> = {
  low:    "bg-white/20",
  medium: "bg-white/40",
  high:   "bg-amber-400",
  urgent: "bg-red-400",
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"
const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

function fmtLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export default async function TasksPage() {
  const tasks = await getTasks()

  const counts = TASK_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s).length }),
    {} as Record<string, number>,
  )

  const open = tasks.filter((t) => t.status !== "done")
  const done = tasks.filter((t) => t.status === "done")

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Tasks</h1>
        <p className="mt-2 text-sm text-white/50">Internal label operations and to-dos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-10">
        {[
          { label: "Open",        value: counts.open ?? 0 },
          { label: "In Progress", value: counts.in_progress ?? 0 },
          { label: "Blocked",     value: counts.blocked ?? 0 },
          { label: "Done",        value: counts.done ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {open.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8">
                <h2 className="text-sm font-medium">Active Tasks ({open.length})</h2>
              </div>
              <div className="divide-y divide-white/5">
                {open.map((t) => (
                  <div key={t.id} className="px-6 py-4 flex items-start gap-4 flex-wrap">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityDot[t.priority] ?? "bg-white/20"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[t.status] ?? statusStyle.open}`}>
                          {fmtLabel(t.status)}
                        </span>
                        <span className={`text-xs font-medium ${priorityStyle[t.priority] ?? ""}`}>
                          {t.priority}
                        </span>
                        <span className="text-sm font-medium">{t.title}</span>
                      </div>
                      <div className="text-xs text-white/30 space-x-2">
                        {t.assignedTo && <span>→ {t.assignedTo}</span>}
                        {t.dueDate && <span>· due {t.dueDate}</span>}
                        {t.entityType && <span>· {t.entityType}{t.entityId ? `: ${t.entityId}` : ""}</span>}
                      </div>
                      {t.description && (
                        <p className="mt-1 text-xs text-white/25 line-clamp-2">{t.description}</p>
                      )}
                    </div>
                    <form action={deleteTask.bind(null, t.id)}>
                      <button type="submit" className="text-xs text-red-400/40 hover:text-red-400 transition shrink-0">
                        Delete
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-[#0d1016]/60 overflow-hidden opacity-50">
              <div className="px-6 py-4 border-b border-white/5">
                <h2 className="text-sm font-medium text-white/35">Completed ({done.length})</h2>
              </div>
              <div className="divide-y divide-white/5">
                {done.map((t) => (
                  <div key={t.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-white/30 line-through">{t.title}</span>
                    <form action={deleteTask.bind(null, t.id)}>
                      <button type="submit" className="text-xs text-red-400/30 hover:text-red-400 transition shrink-0">
                        Delete
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
              No tasks yet. Create the first one →
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 self-start">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">New Task</h2>
          <form action={createTask} className="space-y-4">
            <div>
              <label htmlFor="tsk-title" className={labelClass}>Title</label>
              <input id="tsk-title" name="title" type="text" required placeholder="What needs doing?" className={inputClass} />
            </div>

            <div>
              <label htmlFor="tsk-desc" className={labelClass}>Description</label>
              <textarea id="tsk-desc" name="description" rows={2} placeholder="Details…" className={`${inputClass} resize-none`} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tsk-priority" className={labelClass}>Priority</label>
                <select id="tsk-priority" name="priority" defaultValue="medium" className={inputClass}>
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{fmtLabel(p)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tsk-status" className={labelClass}>Status</label>
                <select id="tsk-status" name="status" defaultValue="open" className={inputClass}>
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>{fmtLabel(s)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="tsk-assigned" className={labelClass}>Assigned To</label>
              <input id="tsk-assigned" name="assigned_to" type="text" placeholder="Name or handle" className={inputClass} />
            </div>

            <div>
              <label htmlFor="tsk-due" className={labelClass}>Due Date</label>
              <input id="tsk-due" name="due_date" type="date" className={inputClass} />
            </div>

            <div>
              <label htmlFor="tsk-created-by" className={labelClass}>Created By</label>
              <input id="tsk-created-by" name="created_by" type="text" placeholder="Your name" className={inputClass} />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Create Task
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
