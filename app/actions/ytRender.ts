"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"
import { renderJobToMp4 } from "@/lib/youtube/renderer"

export async function renderJob(formData: FormData) {
  await requireAdmin()

  const jobId           = formData.get("job_id")?.toString() ?? ""
  const thumbnailAssetId = formData.get("thumbnail_asset_id")?.toString() || null
  const accentColor      = formData.get("accent_color")?.toString() || undefined

  if (!jobId) throw new Error("job_id is required")

  // Fetch job for title + producer slug
  const { data: job, error } = await supabase
    .from("yt_upload_jobs")
    .select("title, producer_slug")
    .eq("id", jobId)
    .single()

  if (error || !job) throw new Error("Job not found")

  const { title, producer_slug } = job as { title: string | null; producer_slug: string }

  await renderJobToMp4({
    jobId,
    title:             title ?? "Untitled Beat",
    producer:          producer_slug,
    thumbnailAssetId,
    accentColor,
  })

  revalidatePath("/admin/youtube/render")
  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
  revalidatePath("/admin/youtube/engine")
}

export async function renderAllJobs(formData: FormData) {
  await requireAdmin()

  const jobIds = formData.getAll("job_id").map((v) => v.toString()).filter(Boolean)
  if (jobIds.length === 0) return

  for (const jobId of jobIds) {
    const { data: job } = await supabase
      .from("yt_upload_jobs")
      .select("title, producer_slug")
      .eq("id", jobId)
      .single()

    if (!job) continue

    const { title, producer_slug } = job as { title: string | null; producer_slug: string }

    await renderJobToMp4({
      jobId,
      title:    title ?? "Untitled Beat",
      producer: producer_slug,
    })
  }

  revalidatePath("/admin/youtube/render")
  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
  revalidatePath("/admin/youtube/engine")
}
