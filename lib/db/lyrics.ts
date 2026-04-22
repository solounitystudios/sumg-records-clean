import { supabase } from "@/lib/db/supabase"
import type { LyricProject, LyricDraft, LyricContribution, LyricApproval, LyricPersonaProfile } from "@/lib/types/lyrics"

// ── Projects ──────────────────────────────────────────────────────────────────

type ProjectRow = {
  id: string
  title: string
  release_slug: string | null
  artist_slug: string | null
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
}

function toProject(row: ProjectRow): LyricProject {
  return {
    id: row.id,
    title: row.title,
    releaseSlug: row.release_slug,
    artistSlug: row.artist_slug,
    status: row.status as LyricProject["status"],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getLyricProjects(): Promise<LyricProject[]> {
  const { data, error } = await supabase
    .from("lyric_projects")
    .select("id, title, release_slug, artist_slug, status, created_by, created_at, updated_at")
    .order("updated_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ProjectRow[]).map(toProject)
}

export async function getLyricProjectById(id: string): Promise<LyricProject | null> {
  const { data, error } = await supabase
    .from("lyric_projects")
    .select("id, title, release_slug, artist_slug, status, created_by, created_at, updated_at")
    .eq("id", id)
    .single()
  if (error) return null
  return toProject(data as ProjectRow)
}

// ── Drafts ────────────────────────────────────────────────────────────────────

type DraftRow = {
  id: string
  project_id: string
  version: number
  content: string
  contributor_id: string | null
  notes: string | null
  created_at: string
}

function toDraft(row: DraftRow): LyricDraft {
  return {
    id: row.id,
    projectId: row.project_id,
    version: row.version,
    content: row.content,
    contributorId: row.contributor_id,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export async function getLyricDrafts(projectId: string): Promise<LyricDraft[]> {
  const { data, error } = await supabase
    .from("lyric_drafts")
    .select("id, project_id, version, content, contributor_id, notes, created_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
  if (error) throw new Error(error.message)
  return (data as DraftRow[]).map(toDraft)
}

// ── Contributions ─────────────────────────────────────────────────────────────

type ContributionRow = {
  id: string
  project_id: string
  contributor_id: string
  role: string
  split_percentage: number
  created_at: string
  contributors: { name: string; type: string }[] | null
}

function toContribution(row: ContributionRow): LyricContribution {
  const contributor = Array.isArray(row.contributors) ? row.contributors[0] : row.contributors
  return {
    id: row.id,
    projectId: row.project_id,
    contributorId: row.contributor_id,
    contributorName: contributor?.name ?? "Unknown",
    contributorType: (contributor?.type ?? "human") as LyricContribution["contributorType"],
    role: row.role as LyricContribution["role"],
    splitPercentage: Number(row.split_percentage),
    createdAt: row.created_at,
  }
}

export async function getLyricContributions(projectId: string): Promise<LyricContribution[]> {
  const { data, error } = await supabase
    .from("lyric_contributions")
    .select("id, project_id, contributor_id, role, split_percentage, created_at, contributors(name, type)")
    .eq("project_id", projectId)
    .order("split_percentage", { ascending: false })
  if (error) throw new Error(error.message)
  return (data as ContributionRow[]).map(toContribution)
}

// ── Approvals ─────────────────────────────────────────────────────────────────

type ApprovalRow = {
  id: string
  draft_id: string
  approved_by: string
  status: string
  notes: string | null
  created_at: string
}

function toApproval(row: ApprovalRow): LyricApproval {
  return {
    id: row.id,
    draftId: row.draft_id,
    approvedBy: row.approved_by,
    status: row.status as LyricApproval["status"],
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export async function getLyricApprovalsForProject(projectId: string): Promise<LyricApproval[]> {
  const { data: draftRows } = await supabase
    .from("lyric_drafts")
    .select("id")
    .eq("project_id", projectId)

  const draftIds = (draftRows ?? []).map((d: { id: string }) => d.id)
  if (draftIds.length === 0) return []

  const { data, error } = await supabase
    .from("lyric_approvals")
    .select("id, draft_id, approved_by, status, notes, created_at")
    .in("draft_id", draftIds)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data as ApprovalRow[]).map(toApproval)
}

// ── Persona Profiles ──────────────────────────────────────────────────────────

export type PersonaProfileWithName = LyricPersonaProfile & { contributorName: string }

type PersonaRow = {
  id: string
  contributor_id: string
  style_summary: string | null
  vocabulary_profile: Record<string, unknown>
  training_sources: string[]
  created_at: string
  updated_at: string
  contributors: { name: string }[] | null
}

export async function getPersonaProfilesForProject(projectId: string): Promise<PersonaProfileWithName[]> {
  const { data: contribRows } = await supabase
    .from("lyric_contributions")
    .select("contributor_id, contributors!inner(type)")
    .eq("project_id", projectId)

  type ContribWithType = { contributor_id: string; contributors: { type: string }[] | null }
  const aiIds = ((contribRows ?? []) as ContribWithType[])
    .filter((c) => {
      const t = Array.isArray(c.contributors) ? c.contributors[0]?.type : null
      return t === "ai_persona"
    })
    .map((c) => c.contributor_id)

  if (aiIds.length === 0) return []

  const { data, error } = await supabase
    .from("lyric_persona_profiles")
    .select("id, contributor_id, style_summary, vocabulary_profile, training_sources, created_at, updated_at, contributors(name)")
    .in("contributor_id", aiIds)

  if (error) throw new Error(error.message)

  return ((data ?? []) as PersonaRow[]).map((row) => ({
    id: row.id,
    contributorId: row.contributor_id,
    styleSummary: row.style_summary,
    vocabularyProfile: row.vocabulary_profile ?? {},
    trainingSources: row.training_sources ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contributorName: Array.isArray(row.contributors) ? (row.contributors[0]?.name ?? "Unknown") : "Unknown",
  }))
}
