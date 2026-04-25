"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"

function parseTags(raw: string): string[] {
  return raw.split("\n").map((s) => s.trim()).filter(Boolean)
}

export async function createYtChannel(formData: FormData) {
  await requireAdmin()

  const producerSlug = formData.get("producer_slug")?.toString().trim() ?? ""
  const channelId    = formData.get("channel_id")?.toString().trim() ?? ""

  if (!producerSlug || !channelId) throw new Error("producer_slug and channel_id are required.")

  const { error } = await supabase.from("yt_channels").insert({
    producer_slug: producerSlug,
    channel_id: channelId,
    channel_handle: formData.get("channel_handle")?.toString().trim() || null,
    channel_url: formData.get("channel_url")?.toString().trim() || null,
    upload_cadence: parseInt(formData.get("upload_cadence")?.toString() ?? "3", 10) || 3,
    title_template: formData.get("title_template")?.toString().trim() || null,
    description_template: formData.get("description_template")?.toString().trim() || null,
    default_tags: parseTags(formData.get("default_tags")?.toString() ?? ""),
    status: "active",
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/youtube")
  revalidatePath("/admin/youtube/channels")
  redirect("/admin/youtube/channels")
}

export async function updateYtChannel(id: string, formData: FormData) {
  await requireAdmin()

  const { error } = await supabase
    .from("yt_channels")
    .update({
      channel_handle: formData.get("channel_handle")?.toString().trim() || null,
      channel_url: formData.get("channel_url")?.toString().trim() || null,
      upload_cadence: parseInt(formData.get("upload_cadence")?.toString() ?? "3", 10) || 3,
      title_template: formData.get("title_template")?.toString().trim() || null,
      description_template: formData.get("description_template")?.toString().trim() || null,
      default_tags: parseTags(formData.get("default_tags")?.toString() ?? ""),
      status: formData.get("status")?.toString() ?? "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/youtube/channels")
  redirect("/admin/youtube/channels")
}

export async function createYtJob(formData: FormData) {
  await requireAdmin()

  const producerSlug = formData.get("producer_slug")?.toString().trim() ?? ""
  const assetId      = formData.get("asset_id")?.toString().trim() ?? ""
  const ytChannelId  = formData.get("yt_channel_id")?.toString().trim() ?? ""

  if (!producerSlug || !assetId || !ytChannelId) {
    throw new Error("producer_slug, asset_id, and yt_channel_id are required.")
  }

  const scheduledAtRaw = formData.get("scheduled_at")?.toString().trim()

  const { error } = await supabase.from("yt_upload_jobs").insert({
    producer_slug: producerSlug,
    asset_id: assetId,
    yt_channel_id: ytChannelId,
    status: "pending",
    title: formData.get("title")?.toString().trim() || null,
    description: formData.get("description")?.toString().trim() || null,
    tags: parseTags(formData.get("tags")?.toString() ?? ""),
    scheduled_at: scheduledAtRaw ? new Date(scheduledAtRaw).toISOString() : null,
    updated_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
  redirect("/admin/youtube/queue")
}

export async function createYtJobFromPack(formData: FormData) {
  await requireAdmin()

  const packId       = formData.get("pack_id")?.toString() ?? ""
  const producerSlug = formData.get("producer_slug")?.toString().trim() ?? ""
  const channelId    = formData.get("yt_channel_id")?.toString().trim() || null
  const assetId      = formData.get("asset_id")?.toString().trim() || null
  const title        = formData.get("title")?.toString().trim() || null
  const description  = formData.get("description")?.toString().trim() || null
  const scheduledRaw = formData.get("scheduled_at")?.toString().trim()
  const tags         = parseTags(formData.get("tags")?.toString() ?? "")

  if (!packId || !producerSlug) throw new Error("pack_id and producer_slug are required.")

  const status = assetId ? (scheduledRaw ? "scheduled" : "pending") : "needs_asset"

  const { data: job, error: jobErr } = await supabase
    .from("yt_upload_jobs")
    .insert({
      producer_slug: producerSlug,
      asset_id:      assetId,
      yt_channel_id: channelId,
      dna_pack_id:   packId,
      status,
      title,
      description,
      tags,
      scheduled_at:  scheduledRaw ? new Date(scheduledRaw).toISOString() : null,
      updated_at:    new Date().toISOString(),
    })
    .select("id")
    .single()

  if (jobErr) throw new Error(jobErr.message)

  const { error: packErr } = await supabase
    .from("dna_packs")
    .update({
      yt_job_id:  job.id,
      status:     "assigned_to_queue",
      updated_at: new Date().toISOString(),
    })
    .eq("id", packId)

  if (packErr) throw new Error(packErr.message)

  revalidatePath("/admin/dna/packs")
  revalidatePath("/admin/youtube/queue")
  redirect("/admin/youtube/queue")
}

export async function assignAssetToJob(formData: FormData) {
  await requireAdmin()

  const jobId       = formData.get("job_id")?.toString() ?? ""
  const assetId     = formData.get("asset_id")?.toString().trim() || null
  const scheduledRaw = formData.get("scheduled_at")?.toString().trim()

  if (!jobId)    throw new Error("job_id is required.")
  if (!assetId)  throw new Error("Please select an audio asset.")

  const status = scheduledRaw ? "scheduled" : "pending"

  const { error } = await supabase
    .from("yt_upload_jobs")
    .update({
      asset_id:     assetId,
      status,
      scheduled_at: scheduledRaw ? new Date(scheduledRaw).toISOString() : null,
      updated_at:   new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "needs_asset")

  if (error) throw new Error(error.message)

  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
}

export async function cancelYtJob(formData: FormData) {
  await requireAdmin()

  const id = formData.get("id")?.toString() ?? ""
  const { error } = await supabase
    .from("yt_upload_jobs")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["needs_asset", "scheduled", "pending", "processing"])

  if (error) throw new Error(error.message)

  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
}
