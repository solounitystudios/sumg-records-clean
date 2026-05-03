"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/server"
import { supabase as adminDb } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import type {
  ThumbnailProject,
  ThumbnailVersion,
  ThumbnailPreset,
  ThumbnailPromptRow,
  UploadJobForStudio,
  CanvasConfig,
  PromptLibraryFilters,
  ThumbnailAsset,
  MidjourneyQueueRow,
} from "./types"

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getJobsForStudio(): Promise<UploadJobForStudio[]> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from("yt_upload_jobs")
    .select(
      "id, title, producer_slug, status, thumbnail_mode, thumbnail_status, thumbnail_asset_id, thumbnail_project_id, scheduled_at, created_at, yt_channel_id",
    )
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("[getJobsForStudio] query error:", error.message)
    return []
  }
  const rows = (data ?? []) as UploadJobForStudio[]
  console.log(`[getJobsForStudio] returned ${rows.length} rows — statuses: ${[...new Set(rows.map(r => r.status))].join(", ") || "none"}`)
  return rows
}

export async function getOrCreateProject(jobId: string): Promise<ThumbnailProject | { error: string }> {
  const supabase = await createServiceClient()

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
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from("thumbnail_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("version_number", { ascending: true })
  return (data ?? []) as ThumbnailVersion[]
}

export async function getPresetsFromDb(producerSlug: string): Promise<ThumbnailPreset[]> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from("thumbnail_presets")
    .select("*")
    .eq("producer_slug", producerSlug)
    .eq("active", true)
    .order("name")
  return (data ?? []) as ThumbnailPreset[]
}

export async function getPromptsFromLibrary(producerSlug: string): Promise<ThumbnailPromptRow[]> {
  const supabase = await createServiceClient()
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
  const supabase = await createServiceClient()
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
  const supabase = await createServiceClient()

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
  const supabase = await createServiceClient()

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
  const supabase = await createServiceClient()
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
  promptUsed?: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient()

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
    prompt_used:          promptUsed ?? null,
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
  const supabase = await createServiceClient()
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

export async function getJobMediaAssets(jobId: string): Promise<{
  audioUrl: string | null
  renderUrl: string | null
}> {
  const supabase = await createServiceClient()

  // Audio URL via audio_inbox → assets
  const { data: inboxRow } = await supabase
    .from("audio_inbox")
    .select("asset_id")
    .eq("yt_job_id", jobId)
    .maybeSingle()

  let audioUrl: string | null = null
  const inboxAssetId = (inboxRow as { asset_id: string } | null)?.asset_id
  if (inboxAssetId) {
    const { data: audioAsset } = await supabase
      .from("assets")
      .select("url, mime_type")
      .eq("id", inboxAssetId)
      .maybeSingle()
    const av = audioAsset as { url: string; mime_type: string } | null
    if (av?.url && av.mime_type?.startsWith("audio/")) {
      audioUrl = av.url
    }
  }

  // Rendered video URL via yt_upload_jobs.asset_id (only if mime is video)
  const { data: jobRow } = await supabase
    .from("yt_upload_jobs")
    .select("asset_id")
    .eq("id", jobId)
    .maybeSingle()

  let renderUrl: string | null = null
  const jobAssetId = (jobRow as { asset_id: string | null } | null)?.asset_id
  if (jobAssetId) {
    const { data: renderAsset } = await supabase
      .from("assets")
      .select("url, mime_type")
      .eq("id", jobAssetId)
      .maybeSingle()
    const rv = renderAsset as { url: string; mime_type: string } | null
    if (rv?.url && rv.mime_type?.startsWith("video/")) {
      renderUrl = rv.url
    }
  }

  return { audioUrl, renderUrl }
}

export async function savePromptToProject(
  projectId: string,
  prompt: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from("thumbnail_projects")
    .update({ notes: prompt, updated_at: new Date().toISOString() })
    .eq("id", projectId)
  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return {}
}

export async function getImageAssetsForPicker(): Promise<Array<{ id: string; url: string; filename: string }>> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from("assets")
    .select("id, url, filename")
    .eq("type", "image")
    .not("status", "eq", "archived")
    .order("created_at", { ascending: false })
    .limit(48)
  return (data ?? []) as Array<{ id: string; url: string; filename: string }>
}

export async function savePromptToLibrary(
  producerSlug: string,
  prompt: string,
  category?: string,
  styleBucket?: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient()
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

// ─── Prompt Library v2: full CRUD ────────────────────────────────────────────

export async function getPromptLibrary(
  filters: PromptLibraryFilters = {}
): Promise<ThumbnailPromptRow[]> {
  const supabase = await createServiceClient()

  let q = supabase
    .from("thumbnail_prompts")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(300)

  if (!filters.includeArchived) q = q.is("archived_at", null)
  if (filters.producerSlug)     q = q.eq("producer_slug", filters.producerSlug)
  if (filters.styleBucket)      q = q.eq("style_bucket", filters.styleBucket)
  if (filters.category)         q = q.eq("category", filters.category)
  if (filters.favoritesOnly)    q = q.eq("favorite", true)
  if (filters.winnersOnly)      q = q.eq("winner_bool", true)
  if (filters.search) {
    const term = filters.search.replace(/[%_]/g, "\\$&")
    q = q.or(`prompt.ilike.%${term}%,name.ilike.%${term}%`)
  }

  const { data } = await q
  return (data ?? []) as ThumbnailPromptRow[]
}

export async function createPrompt(data: {
  producerSlug: string
  prompt: string
  name?: string
  description?: string
  category?: string
  styleBucket?: string
  ctrScore?: number
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createServiceClient()
  const { data: row, error } = await supabase
    .from("thumbnail_prompts")
    .insert({
      producer_slug: data.producerSlug,
      prompt:        data.prompt,
      name:          data.name ?? null,
      description:   data.description ?? null,
      category:      data.category ?? null,
      style_bucket:  data.styleBucket ?? null,
      ctr_score:     data.ctrScore ?? null,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  return { id: (row as { id: string }).id }
}

export async function updatePrompt(
  id: string,
  data: {
    prompt?: string
    name?: string
    description?: string
    category?: string
    styleBucket?: string
    ctrScore?: number | null
  }
): Promise<{ error?: string }> {
  const supabase = await createServiceClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.prompt      !== undefined) updates.prompt       = data.prompt
  if (data.name        !== undefined) updates.name         = data.name ?? null
  if (data.description !== undefined) updates.description  = data.description ?? null
  if (data.category    !== undefined) updates.category     = data.category ?? null
  if (data.styleBucket !== undefined) updates.style_bucket = data.styleBucket ?? null
  if (data.ctrScore    !== undefined) updates.ctr_score    = data.ctrScore ?? null

  const { error } = await supabase.from("thumbnail_prompts").update(updates).eq("id", id)
  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return {}
}

export async function archivePrompt(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from("thumbnail_prompts")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return {}
}

export async function restorePrompt(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from("thumbnail_prompts")
    .update({ archived_at: null, updated_at: new Date().toISOString() })
    .eq("id", id)
  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return {}
}

export async function deletePromptPermanently(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient()
  const { error } = await supabase.from("thumbnail_prompts").delete().eq("id", id)
  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return {}
}

export async function duplicatePrompt(id: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createServiceClient()
  const { data: src } = await supabase.from("thumbnail_prompts").select("*").eq("id", id).single()
  if (!src) return { error: "Prompt not found" }

  const r = src as Record<string, unknown>
  const { data: row, error } = await supabase
    .from("thumbnail_prompts")
    .insert({
      producer_slug: r.producer_slug,
      prompt:        r.prompt,
      name:          r.name ? `Copy of ${r.name}` : null,
      description:   r.description ?? null,
      category:      r.category ?? null,
      style_bucket:  r.style_bucket ?? null,
      ctr_score:     r.ctr_score ?? null,
    })
    .select("id")
    .single()

  revalidatePath("/admin/youtube/thumbnail-studio")
  if (error) return { error: error.message }
  return { id: (row as { id: string }).id }
}

export async function markPromptFavorite(id: string, value: boolean): Promise<{ error?: string }> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from("thumbnail_prompts")
    .update({ favorite: value, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { error: error.message }
  return {}
}

export async function markPromptWinner(id: string, value: boolean): Promise<{ error?: string }> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from("thumbnail_prompts")
    .update({ winner_bool: value, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { error: error.message }
  return {}
}

export async function incrementPromptUseCount(id: string): Promise<void> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from("thumbnail_prompts")
    .select("use_count")
    .eq("id", id)
    .single()
  const current = (data as { use_count: number } | null)?.use_count ?? 0
  await supabase
    .from("thumbnail_prompts")
    .update({ use_count: current + 1, last_used_at: new Date().toISOString() })
    .eq("id", id)
}

// ─── Free Create: save image to asset library ─────────────────────────────────

export async function saveFreeCreateAsset({
  producerSlug,
  imageUrl,
  promptUsed,
  styleBucket,
  name,
}: {
  producerSlug: string
  imageUrl: string
  promptUsed?: string
  styleBucket?: string
  name?: string
}): Promise<{ assetId: string; thumbnailAssetId: string } | { error: string }> {
  const supabase = await createServiceClient()

  // Determine a filename from the URL
  const urlFilename = imageUrl.split("/").pop()?.split("?")[0] ?? ""
  const filename = urlFilename || `thumbnail_free_${Date.now()}.png`
  const mimeType = filename.endsWith(".webp")
    ? "image/webp"
    : filename.endsWith(".jpg") || filename.endsWith(".jpeg")
    ? "image/jpeg"
    : "image/png"

  // 1. Create assets row
  const { data: assetRow, error: assetErr } = await supabase
    .from("assets")
    .insert({
      type:         "image",
      url:          imageUrl,
      filename,
      mime_type:    mimeType,
      size_bytes:   null,
      alt_text:     name ?? "Free Create thumbnail",
      attached_to:  null,
      uploaded_by:  "thumbnail_studio_free_create",
      producer_slug: producerSlug || null,
      status:       "ready",
      tags:         ["thumbnail", "free-create"],
    })
    .select("id")
    .single()

  if (assetErr) return { error: assetErr.message }
  const assetId = (assetRow as { id: string }).id

  // 2. Record in thumbnail_assets library (no linked job)
  const { data: taRow, error: taErr } = await supabase
    .from("thumbnail_assets")
    .insert({
      producer_slug:        producerSlug || null,
      image_url:            imageUrl,
      prompt_used:          promptUsed ?? null,
      style_bucket:         styleBucket ?? null,
      asset_id:             assetId,
      name:                 name ?? null,
      linked_upload_job_id: null,
    })
    .select("id")
    .single()

  if (taErr) return { error: taErr.message }

  revalidatePath("/admin/youtube/thumbnail-studio")
  revalidatePath("/admin/assets")
  return { assetId, thumbnailAssetId: (taRow as { id: string }).id }
}

// ─── Midjourney Queue ─────────────────────────────────────────────────────────

export async function createMidjourneyPendingAsset({
  producerSlug,
  prompt,
  styleBucket,
  linkedUploadJobId,
}: {
  producerSlug: string
  prompt: string
  styleBucket?: string
  linkedUploadJobId?: string
}): Promise<{ id: string } | { error: string }> {
  await requireAdmin()
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from("thumbnail_assets")
    .insert({
      producer_slug:        producerSlug || null,
      image_url:            null,
      prompt_used:          prompt,
      style_bucket:         styleBucket ?? null,
      linked_upload_job_id: linkedUploadJobId ?? null,
      provider:             "midjourney",
      provider_status:      "pending",
      provider_prompt:      prompt,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/admin/youtube/thumbnail-studio/midjourney-queue")
  return { id: (data as { id: string }).id }
}

export async function completeMidjourneyAsset({
  id,
  imageUrl,
  existingAssetId,
  producerSlug,
  projectId,
}: {
  id: string
  imageUrl: string
  existingAssetId?: string
  producerSlug?: string
  projectId?: string
}): Promise<{ assetId: string; versionId?: string; permanentUrl: string } | { error: string }> {
  await requireAdmin()

  let assetId = existingAssetId
  let permanentUrl = imageUrl

  if (!assetId) {
    // Download from external URL and re-upload to permanent Supabase storage
    try {
      const dlResp = await fetch(imageUrl)
      if (dlResp.ok) {
        const buf = await dlResp.arrayBuffer()
        const fileKey = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const storagePath = `thumbnails/mj_${fileKey}.png`
        const { error: storageErr } = await adminDb.storage
          .from("sumg-assets")
          .upload(storagePath, buf, { contentType: "image/png", upsert: false })
        if (!storageErr) {
          const { data: urlData } = adminDb.storage.from("sumg-assets").getPublicUrl(storagePath)
          permanentUrl = urlData.publicUrl
        }
      }
    } catch { /* fall back to original URL */ }

    const { data: assetRow, error: assetErr } = await adminDb
      .from("assets")
      .insert({
        type:          "image",
        url:           permanentUrl,
        filename:      `thumbnail_mj_${Date.now()}.png`,
        mime_type:     "image/png",
        size_bytes:    null,
        alt_text:      "Midjourney thumbnail",
        attached_to:   null,
        uploaded_by:   "thumbnail_studio_midjourney",
        producer_slug: producerSlug ?? null,
        status:        "ready",
        tags:          ["thumbnail", "midjourney"],
      })
      .select("id")
      .single()

    if (assetErr) return { error: assetErr.message }
    assetId = (assetRow as { id: string }).id
  }

  // Update the pending thumbnail_assets row
  const supabase = await createServiceClient()
  const { error: taErr } = await supabase
    .from("thumbnail_assets")
    .update({
      image_url:       permanentUrl,
      asset_id:        assetId,
      provider_status: "complete",
    })
    .eq("id", id)

  if (taErr) return { error: taErr.message }

  // If called from Job Mode, also create a thumbnail_version
  let versionId: string | undefined
  if (projectId) {
    const { data: maxVer } = await supabase
      .from("thumbnail_versions")
      .select("version_number")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1)
    const nextNum = ((maxVer?.[0] as { version_number: number } | undefined)?.version_number ?? 0) + 1

    const { data: vRow } = await supabase
      .from("thumbnail_versions")
      .insert({
        project_id:     projectId,
        image_url:      permanentUrl,
        asset_id:       assetId,
        prompt:         null,
        provider:       "midjourney",
        style_bucket:   null,
        version_number: nextNum,
      })
      .select("id")
      .single()
    versionId = (vRow as { id: string } | null)?.id
  }

  revalidatePath("/admin/youtube/thumbnail-studio/midjourney-queue")
  revalidatePath("/admin/youtube/thumbnail-studio")
  return { assetId, versionId, permanentUrl }
}

export async function getMidjourneyQueue(): Promise<MidjourneyQueueRow[]> {
  await requireAdmin()
  const supabase = await createServiceClient()

  const { data: assets, error } = await supabase
    .from("thumbnail_assets")
    .select("*")
    .eq("provider", "midjourney")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error || !assets) return []

  // Enrich with linked job titles
  const jobIds = [...new Set(
    (assets as ThumbnailAsset[])
      .map((a) => a.linked_upload_job_id)
      .filter(Boolean) as string[]
  )]

  const jobTitleMap: Record<string, string> = {}
  if (jobIds.length > 0) {
    const { data: jobs } = await supabase
      .from("yt_upload_jobs")
      .select("id, title")
      .in("id", jobIds)
    if (jobs) {
      for (const j of jobs as Array<{ id: string; title: string | null }>) {
        jobTitleMap[j.id] = j.title ?? "Untitled"
      }
    }
  }

  return (assets as ThumbnailAsset[]).map((a) => ({
    ...a,
    linked_job_title: a.linked_upload_job_id ? (jobTitleMap[a.linked_upload_job_id] ?? null) : null,
  }))
}

export async function markMidjourneyFailed(id: string): Promise<{ error?: string }> {
  await requireAdmin()
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from("thumbnail_assets")
    .update({ provider_status: "failed" })
    .eq("id", id)
    .eq("provider", "midjourney")
  revalidatePath("/admin/youtube/thumbnail-studio/midjourney-queue")
  return error ? { error: error.message } : {}
}

export async function deleteThumbnailAsset(id: string): Promise<{ error?: string }> {
  await requireAdmin()
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from("thumbnail_assets")
    .delete()
    .eq("id", id)
  revalidatePath("/admin/youtube/thumbnail-studio/midjourney-queue")
  revalidatePath("/admin/youtube/thumbnail-studio")
  return error ? { error: error.message } : {}
}
