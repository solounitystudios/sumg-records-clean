"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"
import { buildAuthUrl, isOAuthConfigured } from "@/lib/youtube/oauth"
import { createOAuthState } from "@/lib/youtube/oauth-state-store"
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
  const user = await requireAdmin()
  if (!isOAuthConfigured()) {
    throw new Error("YouTube OAuth is not configured — add YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REDIRECT_URI to your environment")
  }
  const channelId = formData.get("channel_id")?.toString() ?? ""
  if (!channelId) throw new Error("channel_id required")

  // Bind the OAuth state to the channel and to this authenticated admin.
  // Confirm the channel exists first so we never mint state for a bad id.
  const { data: channel, error } = await supabase
    .from("yt_channels")
    .select("id")
    .eq("id", channelId)
    .single()
  if (error || !channel) throw new Error("Unknown channel")

  // SUMG-SEC-P0-005: the OAuth `state` is a single-use 256-bit random token,
  // never the channel id. redirect() must run AFTER the state row is written.
  const state = await createOAuthState({ channelId, initiatedBy: user.id })
  redirect(buildAuthUrl(state))
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
