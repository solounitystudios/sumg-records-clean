import Link from "next/link"
import { notFound } from "next/navigation"
import { getLyricProjectById, getLyricDrafts, getLyricContributions } from "@/lib/db/lyrics"

export const metadata = { title: "Lyric Project — SUMG Admin" }

const statusStyle: Record<string, string> = {
  open: "bg-sky-500/15 text-sky-400",
  in_review: "bg-amber-500/15 text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  archived: "bg-white/8 text-white/35",
}

const roleLabel: Record<string, string> = {
  writer: "Writer",
  "co-writer": "Co-Writer",
  editor: "Editor",
  ai_assist: "AI Assist",
}

export default async function LyricProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [project, drafts, contributions] = await Promise.all([
    getLyricProjectById(id),
    getLyricDrafts(id),
    getLyricContributions(id),
  ])

  if (!project) notFound()

  const totalSplit = contributions.reduce((s, c) => s + c.splitPercentage, 0)

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-8">
        <Link
          href="/admin/lyrics"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← Lyric Engine
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
            <h1 className="text-3xl font-semibold">{project.title}</h1>
            <p className="mt-1 text-sm text-white/50">
              {project.artistSlug ?? "No artist"}
              {project.releaseSlug ? ` · ${project.releaseSlug}` : ""}
            </p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full shrink-0 ${statusStyle[project.status]}`}>
            {project.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Contributor splits */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-4">Contributor Splits</h2>
        {contributions.length > 0 ? (
          <>
            <div className="space-y-2">
              {contributions.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-white/10 bg-[#0d1016] px-4 py-3 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{c.contributorName}</span>
                    <span className="ml-2 text-xs text-white/35">{roleLabel[c.role] ?? c.role}</span>
                    {c.contributorType === "ai_persona" && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400">AI</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold tabular-nums shrink-0">
                    {c.splitPercentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <span className={`text-xs tabular-nums ${Math.abs(totalSplit - 100) < 0.01 ? "text-emerald-400" : "text-amber-400"}`}>
                Total: {totalSplit.toFixed(1)}% {Math.abs(totalSplit - 100) >= 0.01 && "(must reach 100%)"}
              </span>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#0d1016] p-5 text-sm text-white/35">
            No contributors assigned yet.
          </div>
        )}
      </section>

      {/* Drafts */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-4">
          Drafts ({drafts.length})
        </h2>
        {drafts.length > 0 ? (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-xl border border-white/10 bg-[#0d1016] p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                    Version {draft.version}
                  </span>
                  <span className="text-xs text-white/25">
                    {new Date(draft.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </span>
                </div>
                <pre className="text-sm text-white/70 whitespace-pre-wrap font-sans leading-7">
                  {draft.content}
                </pre>
                {draft.notes && (
                  <p className="mt-3 text-xs text-white/35 italic">{draft.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#0d1016] p-5 text-sm text-white/35">
            No drafts yet.
          </div>
        )}
      </section>
    </main>
  )
}
