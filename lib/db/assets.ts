import { supabase } from "./supabase"
import type { AssetType } from "@/lib/types"

export interface AssetRow {
  id: string
  type: AssetType
  url: string
  filename: string
  mime_type: string
  size_bytes: number | null
  alt_text: string | null
  attached_to: unknown
  uploaded_by: string | null
  created_at: string
}

export async function getAssets(type?: AssetType): Promise<AssetRow[]> {
  let q = supabase
    .from("assets")
    .select("id, type, url, filename, mime_type, size_bytes, alt_text, attached_to, uploaded_by, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  if (type) q = q.eq("type", type)

  const { data, error } = await q
  if (error) throw new Error(`getAssets: ${error.message}`)
  return (data ?? []) as AssetRow[]
}

export async function getAssetById(id: string): Promise<AssetRow | null> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return data as AssetRow
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
