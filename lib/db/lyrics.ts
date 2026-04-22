import { supabase } from "@/lib/db/supabase"
import type { LyricProject, LyricDraft, LyricContribution } from "@/lib/types/lyrics"

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
