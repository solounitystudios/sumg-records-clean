"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export type LyricActionResult = { success: true } | { error: string }

export async function createLyricProject(formData: FormData) {
  await requireAdmin()

  const title = (formData.get("title") as string ?? "").trim()
  if (!title) throw new Error("Title is required.")

  const artistSlug = (formData.get("artistSlug") as string ?? "").trim() || null
  const releaseSlug = (formData.get("releaseSlug") as string ?? "").trim() || null
  const status = (formData.get("status") as string) || "open"

  const { data, error } = await supabase
    .from("lyric_projects")
    .insert({ title, artist_slug: artistSlug, release_slug: releaseSlug, status, created_by: "admin" })
    .select("id")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to create project.")

  revalidatePath("/admin/lyrics")
  redirect(`/admin/lyrics/${data.id}`)
}

export async function createLyricDraft(projectId: string, formData: FormData): Promise<LyricActionResult> {
  await requireAdmin()

  const content = (formData.get("content") as string ?? "").trim()
  if (!content) return { error: "Content is required." }

  const notes = (formData.get("notes") as string ?? "").trim() || null
  const contributorId = (formData.get("contributorId") as string ?? "").trim() || null

  const { data: existing } = await supabase
    .from("lyric_drafts")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)

  const version = (existing?.[0]?.version ?? 0) + 1

  const { error } = await supabase
    .from("lyric_drafts")
    .insert({ project_id: projectId, content, notes, contributor_id: contributorId, version })

  if (error) return { error: error.message }

  await supabase
    .from("lyric_projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", projectId)

  revalidatePath(`/admin/lyrics/${projectId}`)
  return { success: true }
}

export async function addLyricContribution(projectId: string, formData: FormData): Promise<LyricActionResult> {
  await requireAdmin()

  const contributorId = (formData.get("contributorId") as string ?? "").trim()
  if (!contributorId) return { error: "Contributor is required." }

  const role = (formData.get("role") as string) || "writer"
  const splitPercentage = parseFloat((formData.get("splitPercentage") as string) ?? "0")

  if (isNaN(splitPercentage) || splitPercentage < 0 || splitPercentage > 100) {
    return { error: "Split must be between 0 and 100." }
  }

  const { error } = await supabase
    .from("lyric_contributions")
    .upsert(
      { project_id: projectId, contributor_id: contributorId, role, split_percentage: splitPercentage },
      { onConflict: "project_id,contributor_id" },
    )

  if (error) return { error: error.message }

  revalidatePath(`/admin/lyrics/${projectId}`)
  return { success: true }
}

export async function recordLyricApproval(draftId: string, formData: FormData): Promise<LyricActionResult> {
  await requireAdmin()

  const status = (formData.get("status") as string ?? "").trim()
  const notes = (formData.get("notes") as string ?? "").trim() || null

  if (!["approved", "rejected", "revision_requested"].includes(status)) {
    return { error: "Invalid approval status." }
  }

  const { data: draft } = await supabase
    .from("lyric_drafts")
    .select("project_id")
    .eq("id", draftId)
    .single()

  if (!draft) return { error: "Draft not found." }
  const projectId: string = draft.project_id

  if (status === "approved") {
    const { data: contributions } = await supabase
      .from("lyric_contributions")
      .select("split_percentage")
      .eq("project_id", projectId)

    const total = (contributions ?? []).reduce(
      (s: number, c: { split_percentage: number }) => s + Number(c.split_percentage),
      0,
    )

    if (Math.abs(total - 100) >= 0.01) {
      return { error: `Splits must total 100% before approving (current: ${total.toFixed(1)}%).` }
    }

    await supabase
      .from("lyric_projects")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", projectId)
  }

  if (status === "revision_requested") {
    await supabase
      .from("lyric_projects")
      .update({ status: "in_review", updated_at: new Date().toISOString() })
      .eq("id", projectId)
  }

  const { error } = await supabase
    .from("lyric_approvals")
    .insert({ draft_id: draftId, approved_by: "admin", status, notes })

  if (error) return { error: error.message }

  revalidatePath(`/admin/lyrics/${projectId}`)
  revalidatePath("/admin/lyrics")
  return { success: true }
}

export async function updateLyricProjectStatus(projectId: string, formData: FormData): Promise<LyricActionResult> {
  await requireAdmin()

  const status = (formData.get("status") as string ?? "").trim()

  if (!["open", "in_review", "approved", "archived"].includes(status)) {
    return { error: "Invalid status." }
  }

  if (status === "approved") {
    const { data: contributions } = await supabase
      .from("lyric_contributions")
      .select("split_percentage")
      .eq("project_id", projectId)

    const total = (contributions ?? []).reduce(
      (s: number, c: { split_percentage: number }) => s + Number(c.split_percentage),
      0,
    )

    if (Math.abs(total - 100) >= 0.01) {
      return { error: `Splits must total 100% before approving (current: ${total.toFixed(1)}%).` }
    }
  }

  const { error } = await supabase
    .from("lyric_projects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", projectId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/lyrics/${projectId}`)
  revalidatePath("/admin/lyrics")
  return { success: true }
}
