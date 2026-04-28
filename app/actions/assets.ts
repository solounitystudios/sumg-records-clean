"use server"

import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import type { AssetType } from "@/lib/types"

const BUCKET = "sumg-assets"
const MAX_BYTES = 100 * 1024 * 1024 // 100 MB

const MIME_TO_TYPE: Record<string, AssetType> = {
  "image/jpeg":      "image",
  "image/jpg":       "image",
  "image/png":       "image",
  "image/webp":      "image",
  "image/avif":      "image",
  "image/gif":       "image",
  "audio/mpeg":      "audio",
  "audio/mp3":       "audio",
  "audio/wav":       "audio",
  "audio/flac":      "audio",
  "audio/aac":       "audio",
  "audio/ogg":       "audio",
  "video/mp4":       "video",
  "video/quicktime": "video",
  "video/webm":      "video",
  "application/pdf": "document",
  "text/plain":      "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
}

export type AssetUploadResult = { id: string; url: string; type: AssetType } | { error: string }

export async function uploadAssetFile(formData: FormData): Promise<AssetUploadResult> {
  await requireAdmin()

  const file = formData.get("file")
  if (!(file instanceof File)) return { error: "No file provided." }
  if (file.size === 0) return { error: "File is empty." }
  if (file.size > MAX_BYTES) return { error: "File must be under 100 MB." }

  const assetType: AssetType = MIME_TO_TYPE[file.type] ?? "document"
  const explicitFolder = formData.get("folder")?.toString()
  const folder = explicitFolder || (assetType === "image" ? "images" : assetType === "audio" ? "audio" : assetType === "video" ? "videos" : "documents")
  const id = crypto.randomUUID()
  const ext = file.name.split(".").pop() ?? "bin"
  const path = `${folder}/${id}.${ext}`

  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = urlData.publicUrl

  const { data: row, error: dbError } = await supabase
    .from("assets")
    .insert({
      type: assetType,
      url,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      attached_to: null,
      uploaded_by: "admin",
    })
    .select("id")
    .single()

  if (dbError) {
    console.error("[assets] db insert failed:", dbError.message)
    return { error: `Upload succeeded but DB record failed: ${dbError.message}` }
  }

  revalidatePath("/admin/assets")

  const assetId = (row as { id: string }).id

  // Auto-create inbox entry for audio assets and kick off signal analysis.
  // Scoring fetches the full audio file and runs metadata parsing — don't block
  // the upload response on it. Fire-and-forget so the user gets their result
  // immediately; scoring completes in the background or fails silently.
  if (assetType === "audio") {
    const { createInboxEntry } = await import("@/lib/db/audioInbox")
    const entry = await createInboxEntry(assetId)
    if (entry) {
      import("@/app/actions/audioInbox").then(({ scoreAudioAsset }) => {
        scoreAudioAsset(entry.id).catch(console.error)
      })
    }
    revalidatePath("/admin/youtube/inbox")
  }

  return { id: assetId, url, type: assetType }
}

export async function deleteAssetFile(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const { data, error: fetchErr } = await supabase
    .from("assets")
    .select("url")
    .eq("id", id)
    .single()

  if (fetchErr || !data) return { ok: false, error: "Asset not found." }

  const url = (data as { url: string }).url
  const pathMatch = url.match(/\/sumg-assets\/(.+)$/)
  if (pathMatch) {
    await supabase.storage.from(BUCKET).remove([pathMatch[1]])
  }

  // Remove any audio_inbox entry that references this asset before deleting the
  // asset row — otherwise the inbox retains a record with a broken asset reference.
  await supabase.from("audio_inbox").delete().eq("asset_id", id)

  const { error: delErr } = await supabase.from("assets").delete().eq("id", id)
  if (delErr) return { ok: false, error: delErr.message }

  revalidatePath("/admin/assets")
  return { ok: true }
}

export async function bulkDeleteAssets(
  ids: string[],
): Promise<{ deleted: number; errors: string[] }> {
  await requireAdmin()
  if (ids.length === 0) return { deleted: 0, errors: [] }

  const { data } = await supabase
    .from("assets")
    .select("id, url")
    .in("id", ids)

  const rows = (data ?? []) as { id: string; url: string }[]
  const storagePaths = rows
    .map((r) => r.url.match(/\/sumg-assets\/(.+)$/)?.[1])
    .filter((p): p is string => !!p)

  if (storagePaths.length > 0) {
    await supabase.storage.from(BUCKET).remove(storagePaths)
  }

  await supabase.from("audio_inbox").delete().in("asset_id", ids)

  const { error } = await supabase.from("assets").delete().in("id", ids)
  revalidatePath("/admin/assets")
  revalidatePath("/admin/youtube/inbox")

  if (error) return { deleted: 0, errors: [error.message] }
  return { deleted: rows.length, errors: [] }
}

export async function bulkSendToInbox(
  ids: string[],
): Promise<{ queued: number; errors: string[] }> {
  await requireAdmin()
  if (ids.length === 0) return { queued: 0, errors: [] }

  const { data } = await supabase
    .from("assets")
    .select("id, type")
    .in("id", ids)
    .eq("type", "audio")

  const audioIds = (data ?? []).map((r: { id: string }) => r.id)
  if (audioIds.length === 0) return { queued: 0, errors: ["No audio assets in selection."] }

  const { createInboxEntry } = await import("@/lib/db/audioInbox")
  const errors: string[] = []
  let queued = 0

  for (const assetId of audioIds) {
    const entry = await createInboxEntry(assetId)
    if (entry) {
      queued++
      import("@/app/actions/audioInbox").then(({ scoreAudioAsset }) => {
        scoreAudioAsset(entry.id).catch(console.error)
      })
    } else {
      errors.push(`Failed to queue asset ${assetId}`)
    }
  }

  revalidatePath("/admin/youtube/inbox")
  revalidatePath("/admin/assets")
  return { queued, errors }
}

export async function bulkTagAssets(
  ids: string[],
  tags: string[],
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (ids.length === 0 || tags.length === 0) return { ok: true }

  const cleanTags = tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
  if (cleanTags.length === 0) return { ok: true }

  // Append tags without duplicates using Postgres array union
  const { error } = await supabase.rpc("append_asset_tags", {
    p_ids: ids,
    p_tags: cleanTags,
  })

  // Fallback if the RPC doesn't exist: fetch-merge-update in TypeScript
  if (error?.message?.includes("Could not find")) {
    const { data } = await supabase.from("assets").select("id, tags").in("id", ids)
    for (const row of (data ?? []) as { id: string; tags: string[] }[]) {
      const merged = [...new Set([...(row.tags ?? []), ...cleanTags])]
      await supabase.from("assets").update({ tags: merged }).eq("id", row.id)
    }
  } else if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath("/admin/assets")
  return { ok: true }
}

export async function bulkAssignProducer(
  ids: string[],
  producerSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (ids.length === 0) return { ok: true }

  const { error } = await supabase
    .from("assets")
    .update({ producer_slug: producerSlug || null })
    .in("id", ids)

  revalidatePath("/admin/assets")
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function bulkUpdateStatus(
  ids: string[],
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  if (ids.length === 0) return { ok: true }

  const { error } = await supabase
    .from("assets")
    .update({ status })
    .in("id", ids)

  revalidatePath("/admin/assets")
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
