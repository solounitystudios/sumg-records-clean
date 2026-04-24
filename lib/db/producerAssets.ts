import { supabase } from "./supabase"

export type ProducerAssetStatus = "raw" | "queued" | "rendered" | "scheduled" | "published" | "failed"

export interface ProducerAsset {
  id: string
  producerSlug: string
  assetId: string
  status: ProducerAssetStatus
  notes: string | null
  assignedAt: string
  // Joined from assets
  assetUrl?: string
  assetFilename?: string
  assetMimeType?: string
  assetSizeBytes?: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProducerAsset(r: any): ProducerAsset {
  return {
    id: r.id,
    producerSlug: r.producer_slug,
    assetId: r.asset_id,
    status: r.status,
    notes: r.notes ?? null,
    assignedAt: r.assigned_at,
    assetUrl: r.assets?.url,
    assetFilename: r.assets?.filename,
    assetMimeType: r.assets?.mime_type,
    assetSizeBytes: r.assets?.size_bytes ?? null,
  }
}

export async function getProducerAssets(producerSlug: string): Promise<ProducerAsset[]> {
  const { data, error } = await supabase
    .from("producer_assets")
    .select("*, assets(url, filename, mime_type, size_bytes)")
    .eq("producer_slug", producerSlug)
    .order("assigned_at", { ascending: false })
  if (error) throw new Error(`getProducerAssets: ${error.message}`)
  return (data ?? []).map(toProducerAsset)
}

export async function assignAssetToProducer(
  producerSlug: string,
  assetId: string,
  status: ProducerAssetStatus = "raw",
  notes?: string
): Promise<void> {
  const { error } = await supabase.from("producer_assets").insert({
    producer_slug: producerSlug,
    asset_id: assetId,
    status,
    notes: notes ?? null,
  })
  if (error) throw new Error(`assignAssetToProducer: ${error.message}`)
}

export async function updateProducerAssetStatus(
  id: string,
  status: ProducerAssetStatus
): Promise<void> {
  const { error } = await supabase
    .from("producer_assets")
    .update({ status })
    .eq("id", id)
  if (error) throw new Error(`updateProducerAssetStatus: ${error.message}`)
}

export async function unassignProducerAsset(id: string): Promise<void> {
  const { error } = await supabase.from("producer_assets").delete().eq("id", id)
  if (error) throw new Error(`unassignProducerAsset: ${error.message}`)
}
