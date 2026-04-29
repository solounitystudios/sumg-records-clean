import { supabase } from "./supabase"

export async function log(
  jobId:     string | null,
  channelId: string | null,
  level:     "info" | "warn" | "error",
  message:   string,
  details?:  unknown,
): Promise<void> {
  const { error } = await supabase.from("yt_engine_logs").insert({
    job_id:     jobId,
    channel_id: channelId,
    level,
    message,
    details:    details ?? null,
  })
  if (error) console.error("[worker] log write failed:", error.message)
}
