"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  ThumbnailProject,
  ThumbnailVersion,
  ThumbnailPreset,
  ThumbnailPromptRow,
  UploadJobForStudio,
  CanvasConfig,
} from "./types"

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getJobsForStudio(): Promise<UploadJobForStudio[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select(
      "id, title, producer_slug, status, thumbnail_mode, thumbnail_status, thumbnail_asset_id, thumbnail_project_id, scheduled_at, created_at, yt_channel_id",
    )
    .not("status", "in", '("uploaded","cancelled")')
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) return []
  return (data ?? []) as UploadJobForStudio[]
}

export async function getOrCreateProject(jobId: string): Promise<ThumbnailProject | { error: string }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("thumbnail_projects")
    .select("*")
    .eq("upload_job_id", jobId)
    .maybeSingle()

  if (existing) return existing as ThumbnailProject

  const { data: job } = await supabase
    .from("yt_upload_jobs")
    .select("title, producer_slug")
    .eq("id", jobId)
    .single()

  const { data, error } = await supabase
    .from("thumbnail_projects")
    .insert({
      upload_job_id: jobId,
      producer_slug: (job as { producer_slug: string | null } | null)?.producer_slug ?? null,
      title:         (job as { title: string | null } | null)?.title ?? null,
      status:        "draft",
      canvas_json:   {},
    })
    .select("*")
    .single()

  if (error) return { error: error.message }
  return data as ThumbnailProject
}

export async function getProjectVersions(projectId: string): Promise<ThumbnailVersion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("thumbnail_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("version_number", { ascending: true })
  return (data ?? []) as ThumbnailVersion[]
}

export async function getPresetsFromDb(producerSlug: string): Promise<ThumbnailPreset[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("thumbnail_presets")
    .select("*")
    .eq("producer_slug", producerSlug)
    .eq("active", true)
    .order("name")
  return (data ?? []) as ThumbnailPreset[]
}

export async function getPromptsFromLibrary(producerSlug: string): Promise<ThumbnailPromptRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("thumbnail_prompts")
    .select("*")
    .eq("producer_slug", producerSlug)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(50)
  return (data ?? []) as ThumbnailPromptRow[]
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function saveProjectDraft(
  projectId: string,
  canvasJson: CanvasConfig,
  presetSlug?: string,
  notes?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("thumbnail_projects")
    .update({
      canvas_json: canvasJson,
      preset_slug: presetSlug ?? null,
      notes:       notes ?? null,
      updated_at:  new Date().toISOString(),
    })
    .eq("id", projectId)

  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return {}
}

export async function addVersionByUrl(
  projectId: string,
  imageUrl: string,
  prompt?: string,
  styleBucket?: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("thumbnail_versions")
    .select("version_number")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(1)

  const nextNum = ((existing?.[0] as { version_number: number } | undefined)?.version_number ?? 0) + 1

  const { data, error } = await supabase
    .from("thumbnail_versions")
    .insert({
      project_id:     projectId,
      image_url:      imageUrl,
      prompt:         prompt ?? null,
      provider:       "external",
      style_bucket:   styleBucket ?? null,
      version_number: nextNum,
    })
    .select("id")
    .single()

  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return { id: (data as { id: string }).id }
}

export async function selectVersion(
  projectId: string,
  versionId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  await supabase
    .from("thumbnail_versions")
    .update({ selected: false })
    .eq("project_id", projectId)

  const { error } = await supabase
    .from("thumbnail_versions")
    .update({ selected: true })
    .eq("id", versionId)

  await supabase
    .from("thumbnail_projects")
    .update({ selected_version_id: versionId, updated_at: new Date().toISOString() })
    .eq("id", projectId)

  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return {}
}

export async function rejectVersion(versionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("thumbnail_versions")
    .update({ rejected: true, selected: false })
    .eq("id", versionId)

  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return {}
}

export async function approveProject(
  projectId: string,
  versionId: string,
  imageUrl: string,
  jobId: string,
  producerSlug: string | null,
  title: string | null,
  mode: 'generated' | 'edited' | 'custom' = 'generated',
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // 1. Insert into assets so renderer can fetch it by ID
  const filename = `thumbnail_project_${projectId}.png`
  const { data: existing } = await supabase
    .from("assets")
    .select("id")
    .eq("filename", filename)
    .maybeSingle()

  let assetId: string
  if (existing) {
    await supabase.from("assets").update({ url: imageUrl, alt_text: title }).eq("id", (existing as { id: string }).id)
    assetId = (existing as { id: string }).id
  } else {
    const { data: assetRow, error: assetErr } = await supabase
      .from("assets")
      .insert({
        type:        "image",
        url:         imageUrl,
        filename,
        mime_type:   "image/png",
        size_bytes:  null,
        alt_text:    title ?? "Thumbnail",
        attached_to: null,
        uploaded_by: "thumbnail_studio",
      })
      .select("id")
      .single()
    if (assetErr) return { error: assetErr.message }
    assetId = (assetRow as { id: string }).id
  }

  // 2. Record in thumbnail_assets library
  await supabase.from("thumbnail_assets").insert({
    producer_slug:        producerSlug ?? null,
    image_url:            imageUrl,
    linked_upload_job_id: jobId,
  })

  // 3. Update project to approved
  await supabase
    .from("thumbnail_projects")
    .update({
      status:              "approved",
      approved_asset_id:   assetId,
      selected_version_id: versionId,
      updated_at:          new Date().toISOString(),
    })
    .eq("id", projectId)

  // 4. Update upload job — this is the integration point the renderer reads
  const { error } = await supabase
    .from("yt_upload_jobs")
    .update({
      thumbnail_asset_id:   assetId,
      thumbnail_mode:       mode,
      thumbnail_status:     "approved",
      thumbnail_project_id: projectId,
      updated_at:           new Date().toISOString(),
    })
    .eq("id", jobId)

  revalidatePath("/admin/youtube/thumbnail-studio")
  revalidatePath("/admin/youtube/jobs")
  if (error) return { error: error.message }
  return {}
}

export async function skipThumbnail(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("yt_upload_jobs")
    .update({
      thumbnail_mode:   "auto",
      thumbnail_status: "skipped",
      updated_at:       new Date().toISOString(),
    })
    .eq("id", jobId)

  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return {}
}

export async function savePromptToLibrary(
  producerSlug: string,
  prompt: string,
  category?: string,
  styleBucket?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("thumbnail_prompts")
    .insert({
      producer_slug: producerSlug,
      prompt,
      category:     category ?? null,
      style_bucket: styleBucket ?? null,
    })

  if (error) return { error: error.message }
  return {}
}
