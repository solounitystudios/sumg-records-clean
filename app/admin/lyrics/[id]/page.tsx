import Link from "next/link"
import { notFound } from "next/navigation"
import {
  getLyricProjectById,
  getLyricDrafts,
  getLyricContributions,
  getLyricApprovalsForProject,
  getPersonaProfilesForProject,
} from "@/lib/db/lyrics"
import { getContributors } from "@/lib/db/contributors"
import AddDraftForm from "./AddDraftForm"
import AddContributorForm from "./AddContributorForm"
import ApprovalActions from "./ApprovalActions"
import ProjectStatusForm from "./ProjectStatusForm"
import type { LyricApproval } from "@/lib/types/lyrics"

export const metadata = { title: "Lyric Project — SUMG Admin" }

const roleLabel: Record<string, string> = {
  writer: "Writer",
  "co-writer": "Co-Writer",
  editor: "Editor",
  ai_assist: "AI Assist",
}

export default async function LyricProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [project, drafts, contributions, approvals, allContributors, personaProfiles] =
    await Promise.all([
      getLyricProjectById(id),
      getLyricDrafts(id),
      getLyricContributions(id),
      getLyricApprovalsForProject(id),
      getContributors(),
      getPersonaProfilesForProject(id),
    ])

  if (!project) notFound()

  const totalSplit = contributions.reduce((s, c) => s + c.splitPercentage, 0)
  const splitBalanced = Math.abs(totalSplit - 100) < 0.01

  // Latest approval per draft
  const latestApprovalByDraft = approvals.reduce<Record<string, LyricApproval>>((map, a) => {
    if (!map[a.draftId]) map[a.draftId] = a
    return map
  }, {})

  // Contributors already on this project
  const assignedIds = new Set(contributions.map((c) => c.contributorId))
  const availableContributors = allContributors.filter((c) => !assignedIds.has(c.id))

  // Contributors on project (for draft attribution)
  const projectContributors = contributions.map((c) => ({ id: c.contributorId, name: c.contributorName }))

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/lyrics"
          className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block"
        >
          ← Lyric Engine
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
          <h1 className="text-3xl font-semibold">{project.title}</h1>
          {(project.artistSlug || project.releaseSlug) && (
            <p className="mt-1 text-sm text-white/50">
              {project.artistSlug ?? ""}
              {project.artistSlug && project.releaseSlug ? " · " : ""}
              {project.releaseSlug ?? ""}
            </p>
          )}
        </div>
      </div>

      {/* Project Status */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-[#0d1016] p-5">
        <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-4">Project Status</h2>
        <ProjectStatusForm projectId={id} currentStatus={project.status} totalSplit={totalSplit} />
      </section>

      {/* Contributor Splits */}
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
              <span className={`text-xs tabular-nums ${splitBalanced ? "text-emerald-400" : "text-amber-400"}`}>
                Total: {totalSplit.toFixed(1)}%{!splitBalanced && " (must reach 100%)"}
              </span>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#0d1016] p-5 text-sm text-white/35">
            No contributors assigned yet.
          </div>
        )}

        <AddContributorForm projectId={id} availableContributors={availableContributors} />
      </section>

      {/* Drafts */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-4">
          Drafts ({drafts.length})
        </h2>

        {drafts.length > 0 ? (
          <div className="space-y-4 mb-6">
            {drafts.map((draft) => {
              const latestApproval = latestApprovalByDraft[draft.id]
              return (
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
                  <ApprovalActions
                    draftId={draft.id}
                    totalSplit={totalSplit}
                    latestApproval={latestApproval}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#0d1016] p-5 text-sm text-white/35 mb-4">
            No drafts yet.
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-5">
          <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Add Draft</h3>
          <AddDraftForm projectId={id} contributors={projectContributors} />
        </div>
      </section>

      {/* AI Persona Profiles */}
      {personaProfiles.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-4">AI Persona Profiles</h2>
          <div className="space-y-4">
            {personaProfiles.map((profile) => (
              <div key={profile.id} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium">{profile.contributorName}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400">AI Persona</span>
                </div>

                {profile.styleSummary && (
                  <p className="text-sm text-white/60 leading-6 mb-3">{profile.styleSummary}</p>
                )}

                {profile.trainingSources.length > 0 && (
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-[0.12em] mb-1.5">Training Sources</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.trainingSources.map((src) => (
                        <span
                          key={src}
                          className="text-xs px-2 py-0.5 rounded-full border border-violet-500/20 text-violet-300/60"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(profile.vocabularyProfile).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-white/30 hover:text-white/50 cursor-pointer transition select-none">
                      Vocabulary profile
                    </summary>
                    <pre className="mt-2 text-xs text-white/40 bg-black/20 rounded-lg p-3 overflow-x-auto">
                      {JSON.stringify(profile.vocabularyProfile, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
