"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"

function revalidateRenderPaths() {
  revalidatePath("/admin/youtube/render")
  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
  revalidatePath("/admin/youtube/engine")
}

// Save thumbnail + accent color so the render worker picks them up.
// Does not trigger rendering — the external worker polls independently.
export async function setJobThumbnail(formData: FormData) {
  await requireAdmin()

  const jobId            = formData.get("job_id")?.toString() ?? ""
  const thumbnailAssetId = formData.get("thumbnail_asset_id")?.toString() || null
  const accentColor      = formData.get("accent_color")?.toString() || null

  if (!jobId) throw new Error("job_id is required")

  await supabase
    .from("yt_upload_jobs")
    .update({
      thumbnail_asset_id: thumbnailAssetId,
      accent_color:       accentColor,
      updated_at:         new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "needs_render")

  revalidateRenderPaths()
}

// Reset a failed render back to needs_render so the worker retries.
export async function requeueRenderJob(formData: FormData) {
  await requireAdmin()

  const jobId = formData.get("job_id")?.toString() ?? ""
  if (!jobId) throw new Error("job_id is required")

  await supabase
    .from("yt_upload_jobs")
    .update({
      status:        "needs_render",
      error_message: null,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "failed")

  revalidateRenderPaths()
}

// Requeue multiple failed render jobs at once.
export async function requeueAllFailedRenderJobs(formData: FormData) {
  await requireAdmin()

  const jobIds = formData.getAll("job_id").map((v) => v.toString()).filter(Boolean)
  if (jobIds.length === 0) return

  await supabase
    .from("yt_upload_jobs")
    .update({
      status:        "needs_render",
      error_message: null,
      updated_at:    new Date().toISOString(),
    })
    .in("id", jobIds)
    .eq("status", "failed")

  revalidateRenderPaths()
}
