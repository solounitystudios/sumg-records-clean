"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import {
  autoScheduleChannel,
  autoScheduleAllActiveChannels,
} from "@/lib/youtube/scheduler"

export type { AutoScheduleResult, SchedulerSummary } from "@/lib/youtube/scheduler"

export async function scheduleChannelAction(formData: FormData) {
  await requireAdmin()
  const channelId = formData.get("channel_id")?.toString() ?? ""
  if (!channelId) throw new Error("channel_id required")

  const result = await autoScheduleChannel(channelId)
  revalidatePath("/admin/youtube/schedule")
  revalidatePath("/admin/youtube/queue")
  return result
}

export async function scheduleAllChannelsAction() {
  await requireAdmin()

  const summary = await autoScheduleAllActiveChannels()
  revalidatePath("/admin/youtube/schedule")
  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/engine")
  return summary
}
