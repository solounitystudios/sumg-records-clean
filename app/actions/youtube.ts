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

export async function cancelYtJob(formData: FormData) {
  await requireAdmin()

  const id = formData.get("id")?.toString() ?? ""
  const { error } = await supabase
    .from("yt_upload_jobs")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["pending", "processing"])

  if (error) throw new Error(error.message)

  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
}
