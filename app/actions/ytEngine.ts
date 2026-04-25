"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"
import { buildAuthUrl, isOAuthConfigured } from "@/lib/youtube/oauth"
import { runProcessor } from "@/lib/youtube/processor"
import type { ProcessSummary } from "@/lib/youtube/types"

export async function triggerProcessing(): Promise<ProcessSummary> {
  await requireAdmin()
  const summary = await runProcessor()
  revalidatePath("/admin/youtube/engine")
  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
  return summary
}

export async function retryFailedJob(formData: FormData) {
  await requireAdmin()
  const id = formData.get("id")?.toString() ?? ""
  if (!id) throw new Error("Job ID required")

  // Manual retry resets the counter so the job can go through MAX_RETRIES again.
  await supabase
    .from("yt_upload_jobs")
    .update({ status: "pending", error_message: null, retry_count: 0, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "failed")

  revalidatePath("/admin/youtube/engine")
  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
}

export async function initiateOAuth(formData: FormData) {
  await requireAdmin()
  if (!isOAuthConfigured()) {
    throw new Error("YouTube OAuth is not configured — add YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REDIRECT_URI to your environment")
  }
  const channelId = formData.get("channel_id")?.toString() ?? ""
  if (!channelId) throw new Error("channel_id required")
  redirect(buildAuthUrl(channelId))
}

export async function disconnectOAuth(formData: FormData) {
  await requireAdmin()
  const channelId = formData.get("channel_id")?.toString() ?? ""
  if (!channelId) throw new Error("channel_id required")

  await supabase
    .from("yt_channels")
    .update({
      oauth_access_token:  null,
      oauth_refresh_token: null,
      oauth_token_expiry:  null,
      oauth_scope:         null,
      oauth_connected_at:  null,
      updated_at:          new Date().toISOString(),
    })
    .eq("id", channelId)

  revalidatePath("/admin/youtube/engine")
  revalidatePath("/admin/youtube/channels")
}
