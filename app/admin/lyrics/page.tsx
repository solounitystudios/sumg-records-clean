import Link from "next/link"
import { getLyricProjects } from "@/lib/db/lyrics"

export const metadata = { title: "Lyric Engine — SUMG Admin" }

const statusStyle: Record<string, string> = {
  open: "bg-sky-500/15 text-sky-400",
  in_review: "bg-amber-500/15 text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  archived: "bg-white/8 text-white/35",
}

export default async function LyricsAdminPage() {
  const projects = await getLyricProjects()
  const byStatus = {
    open: projects.filter((p) => p.status === "open"),
    in_review: projects.filter((p) => p.status === "in_review"),
    approved: projects.filter((p) => p.status === "approved"),
    archived: projects.filter((p) => p.status === "archived"),
  }

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
          <h1 className="text-3xl font-semibold">Lyric Engine</h1>
          <p className="mt-2 text-sm text-white/50">Manage lyric projects, drafts, and contributor splits.</p>
        </div>
        <Link
          href="/admin/lyrics/new"
          className="shrink-0 rounded-full border border-white/20 px-5 py-2 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white transition"
        >
          + New Project
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-10">
        {(["open", "in_review", "approved", "archived"] as const).map((s) => (
          <div key={s} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">
              {s.replace("_", " ")}
            </div>
            <div className="text-2xl font-semibold">{byStatus[s].length}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/admin/lyrics/${project.id}`}
            className="block rounded-2xl border border-white/10 bg-[#0d1016] p-5 hover:border-white/20 transition"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold">{project.title}</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  {project.artistSlug ?? "No artist"}
                  {project.releaseSlug ? ` · ${project.releaseSlug}` : ""}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${statusStyle[project.status]}`}>
                {project.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-xs text-white/30">
              Updated {new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-8 text-center text-sm text-white/35">
            No lyric projects yet.
          </div>
        )}
      </div>
    </main>
  )
}
