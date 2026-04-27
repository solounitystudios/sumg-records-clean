import "server-only"
import { supabase } from "@/lib/db/supabase"

export interface ChannelScheduleState {
  channelDbId:       string
  producerSlug:      string
  handle:            string | null
  cadence:           number
  uploadsToday:      number
  scheduledToday:    number
  slotsRemaining:    number
  pendingUnscheduled: number
  nextScheduledAt:   string | null
  oauthConnected:    boolean
  channelStatus:     string
}

export interface AutoScheduleResult {
  channelDbId:   string
  handle:        string | null
  scheduled:     number
  skippedReason?: string
}

export interface SchedulerSummary {
  channels:       number
  totalScheduled: number
  results:        AutoScheduleResult[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function utcStartOfDay(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function utcEndOfDay(): string {
  const d = new Date()
  d.setUTCHours(23, 59, 59, 999)
  return d.toISOString()
}

function secondsUntilEndOfDay(): number {
  const end = new Date()
  end.setUTCHours(23, 59, 59, 999)
  return Math.max(60, (end.getTime() - Date.now()) / 1000)
}

// ─── State query ──────────────────────────────────────────────────────────────

export async function getScheduleStateForChannel(channelDbId: string): Promise<ChannelScheduleState | null> {
  const { data: ch, error } = await supabase
    .from("yt_channels")
    .select("producer_slug, channel_handle, upload_cadence, status, oauth_refresh_token")
    .eq("id", channelDbId)
    .single()

  if (error) console.error("[scheduler] yt_channels query:", error.message, error.details)
  if (error || !ch) return null

  const todayStart = utcStartOfDay()
  const todayEnd   = utcEndOfDay()
  const now        = new Date().toISOString()

  const [uploadedRes, scheduledRes, pendingRes, nextRes] = await Promise.all([
    supabase
      .from("yt_upload_jobs")
      .select("id", { count: "exact", head: true })
      .eq("yt_channel_id", channelDbId)
      .eq("status", "uploaded")
      .gte("uploaded_at", todayStart),

    supabase
      .from("yt_upload_jobs")
      .select("id", { count: "exact", head: true })
      .eq("yt_channel_id", channelDbId)
      .eq("status", "scheduled")
      .gte("scheduled_at", todayStart)
      .lte("scheduled_at", todayEnd),

    supabase
      .from("yt_upload_jobs")
      .select("id", { count: "exact", head: true })
      .eq("yt_channel_id", channelDbId)
      .eq("status", "pending")
      .is("scheduled_at", null)
      .not("asset_id", "is", null),

    supabase
      .from("yt_upload_jobs")
      .select("scheduled_at")
      .eq("yt_channel_id", channelDbId)
      .eq("status", "scheduled")
      .gte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(1),
  ])

  const uploadsToday   = uploadedRes.count  ?? 0
  const scheduledToday = scheduledRes.count ?? 0
  const cadence        = (ch.upload_cadence as number | null) ?? 3
  const occupied       = uploadsToday + scheduledToday

  return {
    channelDbId,
    producerSlug:      ch.producer_slug as string,
    handle:            (ch.channel_handle as string | null) ?? null,
    cadence,
    uploadsToday,
    scheduledToday,
    slotsRemaining:    Math.max(0, cadence - occupied),
    pendingUnscheduled: pendingRes.count ?? 0,
    nextScheduledAt:   (nextRes.data as Array<{ scheduled_at: string }> | null)?.[0]?.scheduled_at ?? null,
    oauthConnected:    !!(ch.oauth_refresh_token as string | null),
    channelStatus:     (ch.status as string | null) ?? "active",
  }
}

export async function getAllChannelScheduleStates(): Promise<ChannelScheduleState[]> {
  const { data: channels, error } = await supabase
    .from("yt_channels")
    .select("id")
    .order("created_at", { ascending: true })

  if (error) console.error("[scheduler] channels list:", error.message, error.details)
  if (error || !channels) return []

  const states = await Promise.all(
    (channels as Array<{ id: string }>).map((ch) => getScheduleStateForChannel(ch.id))
  )
  return states.filter((s): s is ChannelScheduleState => s !== null)
}

// ─── Auto-scheduler ───────────────────────────────────────────────────────────

export async function autoScheduleChannel(channelDbId: string): Promise<AutoScheduleResult> {
  const state = await getScheduleStateForChannel(channelDbId)
  if (!state) return { channelDbId, handle: null, scheduled: 0, skippedReason: "Channel not found" }

  const { handle } = state

  if (state.channelStatus !== "active")  return { channelDbId, handle, scheduled: 0, skippedReason: "Channel paused or revoked" }
  if (!state.oauthConnected)             return { channelDbId, handle, scheduled: 0, skippedReason: "OAuth not connected" }
  if (state.slotsRemaining <= 0)         return { channelDbId, handle, scheduled: 0, skippedReason: `At daily limit (${state.cadence}/day)` }
  if (state.pendingUnscheduled === 0)    return { channelDbId, handle, scheduled: 0, skippedReason: "No pending jobs to schedule" }

  const toSchedule = Math.min(state.slotsRemaining, state.pendingUnscheduled)

  const { data: jobs, error } = await supabase
    .from("yt_upload_jobs")
    .select("id")
    .eq("yt_channel_id", channelDbId)
    .eq("status", "pending")
    .is("scheduled_at", null)
    .not("asset_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(toSchedule)

  if (error) console.error("[scheduler] jobs query:", error.message, error.details)
  if (error || !jobs?.length) return { channelDbId, handle, scheduled: 0, skippedReason: "No eligible jobs found" }

  // Spread uploads evenly across remaining time today. Guaranteed at least 60s gap.
  const secsLeft = secondsUntilEndOfDay()
  const interval  = Math.max(60, secsLeft / (jobs.length + 1))
  const now       = Date.now()

  let scheduledCount = 0
  for (let i = 0; i < (jobs as Array<{ id: string }>).length; i++) {
    const slotMs      = now + (i + 1) * interval * 1000
    const scheduledAt = new Date(slotMs).toISOString()

    const { error: updateErr } = await supabase
      .from("yt_upload_jobs")
      .update({ status: "scheduled", scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
      .eq("id", (jobs as Array<{ id: string }>)[i].id)
      .eq("status", "pending")  // optimistic lock — skip if already claimed

    if (updateErr) console.error("[scheduler] job update:", updateErr.message, updateErr.details)
    if (!updateErr) scheduledCount++
  }

  // Track when we last auto-scheduled this channel
  await supabase
    .from("yt_channels")
    .update({ last_scheduled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", channelDbId)

  return { channelDbId, handle, scheduled: scheduledCount }
}

export async function autoScheduleAllActiveChannels(): Promise<SchedulerSummary> {
  const { data: channels, error } = await supabase
    .from("yt_channels")
    .select("id, channel_handle")
    .eq("status", "active")
    .not("oauth_refresh_token", "is", null)

  if (error) console.error("[scheduler] active channels:", error.message, error.details)
  if (error || !channels) return { channels: 0, totalScheduled: 0, results: [] }

  const results       = await Promise.all((channels as Array<{ id: string }>).map((ch) => autoScheduleChannel(ch.id)))
  const totalScheduled = results.reduce((s, r) => s + r.scheduled, 0)

  return { channels: channels.length, totalScheduled, results }
}
