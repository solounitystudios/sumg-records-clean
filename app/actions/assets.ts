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

  // Auto-create inbox entry for audio assets and run signal analysis
  if (assetType === "audio") {
    const { createInboxEntry } = await import("@/lib/db/audioInbox")
    const entry = await createInboxEntry(assetId)
    if (entry) {
      const { scoreAudioAsset } = await import("@/app/actions/audioInbox")
      await scoreAudioAsset(entry.id)
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

  const { error: delErr } = await supabase.from("assets").delete().eq("id", id)
  if (delErr) return { ok: false, error: delErr.message }

  revalidatePath("/admin/assets")
  return { ok: true }
}
