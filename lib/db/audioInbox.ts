import { supabase } from "./supabase"

export type InboxStatus =
  | "new_asset"
  | "analyzing"
  | "needs_review"
  | "needs_metadata"
  | "needs_thumbnail"
  | "needs_render"
  | "ready_to_schedule"
  | "scheduled"
  | "uploaded"
  | "failed"

export interface InboxActionLogEntry {
  action: string
  detail: string
  at: string
}

export interface AudioInboxRow {
  id: string
  assetId: string
  status: InboxStatus
  producerSlug: string | null
  variationId: string | null
  dnaPackId: string | null
  ytJobId: string | null
  generatedTitle: string | null
  generatedDescription: string | null
  generatedTags: string[]
  thumbnailPrompt: string | null
  overrideTitle: string | null
  overrideDescription: string | null
  overrideTags: string[]
  errorMessage: string | null
  actionLog: InboxActionLogEntry[]
  createdAt: string
  updatedAt: string
  // Signal intelligence
  bpm: number | null
  keySignature: string | null
  durationSeconds: number | null
  qualityScore: number | null
  commercialScore: number | null
  ctrScore: number | null
  signalData: Record<string, unknown> | null
  // Joined from assets
  assetFilename: string | null
  assetUrl: string | null
  assetSizeBytes: number | null
  assetMimeType: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(r: any): AudioInboxRow {
  return {
    id:                   r.id,
    assetId:              r.asset_id,
    status:               r.status,
    producerSlug:         r.producer_slug ?? null,
    variationId:          r.variation_id ?? null,
    dnaPackId:            r.dna_pack_id ?? null,
    ytJobId:              r.yt_job_id ?? null,
    generatedTitle:       r.generated_title ?? null,
    generatedDescription: r.generated_description ?? null,
    generatedTags:        r.generated_tags ?? [],
    thumbnailPrompt:      r.thumbnail_prompt ?? null,
    overrideTitle:        r.override_title ?? null,
    overrideDescription:  r.override_description ?? null,
    overrideTags:         r.override_tags ?? [],
    errorMessage:         r.error_message ?? null,
    actionLog:            (r.action_log as InboxActionLogEntry[]) ?? [],
    createdAt:            r.created_at,
    updatedAt:            r.updated_at,
    bpm:                  r.bpm ?? null,
    keySignature:         r.key_signature ?? null,
    durationSeconds:      r.duration_seconds ?? null,
    qualityScore:         r.quality_score ?? null,
    commercialScore:      r.commercial_score ?? null,
    ctrScore:             r.ctr_score ?? null,
    signalData:           r.signal_data ?? null,
    assetFilename:        r.assets?.filename ?? null,
    assetUrl:             r.assets?.url ?? null,
    assetSizeBytes:       r.assets?.size_bytes ?? null,
    assetMimeType:        r.assets?.mime_type ?? null,
  }
}

export async function getAllInboxItems(status?: InboxStatus): Promise<AudioInboxRow[]> {
  let q = supabase
    .from("audio_inbox")
    .select("*, assets(filename, url, size_bytes, mime_type)")
    .order("created_at", { ascending: false })
    .limit(500)

  if (status) q = q.eq("status", status)

  const { data, error } = await q
  if (error) throw new Error(`getAllInboxItems: ${error.message}`)
  return (data ?? []).map(toRow)
}

export async function getInboxItemById(id: string): Promise<AudioInboxRow | null> {
  const { data, error } = await supabase
    .from("audio_inbox")
    .select("*, assets(filename, url, size_bytes, mime_type)")
    .eq("id", id)
    .single()
  if (error) return null
  return toRow(data)
}

export async function getInboxByAssetId(assetId: string): Promise<AudioInboxRow | null> {
  const { data, error } = await supabase
    .from("audio_inbox")
    .select("*, assets(filename, url, size_bytes, mime_type)")
    .eq("asset_id", assetId)
    .maybeSingle()
  if (error || !data) return null
  return toRow(data)
}

export async function createInboxEntry(assetId: string): Promise<AudioInboxRow | null> {
  const { data, error } = await supabase
    .from("audio_inbox")
    .insert({
      asset_id:   assetId,
      status:     "new_asset",
      action_log: [{ action: "created", detail: "Audio asset uploaded", at: new Date().toISOString() }],
    })
    .select("*, assets(filename, url, size_bytes, mime_type)")
    .single()
  if (error) {
    console.error("[audio_inbox] createInboxEntry failed:", error.message)
    return null
  }
  return toRow(data)
}

export async function getInboxCounts(): Promise<Record<InboxStatus | "all", number>> {
  const { data, error } = await supabase
    .from("audio_inbox")
    .select("status")
  if (error) throw new Error(`getInboxCounts: ${error.message}`)

  const counts: Record<string, number> = { all: 0 }
  for (const row of data ?? []) {
    counts.all = (counts.all ?? 0) + 1
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }
  return counts as Record<InboxStatus | "all", number>
}
