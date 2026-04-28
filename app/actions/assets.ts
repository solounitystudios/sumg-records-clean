"use server"

import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import type { AssetType } from "@/lib/types"

const BUCKET = "sumg-assets"

// Per-type size limits
const SIZE_LIMIT: Record<AssetType, number> = {
  audio:    500 * 1024 * 1024, // 500 MB — stems, masters
  video:    500 * 1024 * 1024, // 500 MB
  archive:  500 * 1024 * 1024, // 500 MB — zip packs
  image:     50 * 1024 * 1024, //  50 MB
  design:   100 * 1024 * 1024, // 100 MB — PSD, AI
  document:  50 * 1024 * 1024, //  50 MB
}
const DEFAULT_SIZE_LIMIT = 200 * 1024 * 1024 // 200 MB fallback

const MIME_TO_TYPE: Record<string, AssetType> = {
  // ── Images ──────────────────────────────────────────────────────────────────
  "image/jpeg":              "image",
  "image/jpg":               "image",
  "image/png":               "image",
  "image/webp":              "image",
  "image/avif":              "image",
  "image/gif":               "image",
  "image/svg+xml":           "image",
  "image/tiff":              "image",
  "image/heic":              "image",
  "image/heif":              "image",
  // ── Audio ───────────────────────────────────────────────────────────────────
  "audio/mpeg":              "audio",
  "audio/mp3":               "audio",
  "audio/wav":               "audio",
  "audio/x-wav":             "audio",
  "audio/flac":              "audio",
  "audio/x-flac":            "audio",
  "audio/aiff":              "audio",
  "audio/x-aiff":            "audio",
  "audio/m4a":               "audio",
  "audio/x-m4a":             "audio",
  "audio/mp4":               "audio",
  "audio/aac":               "audio",
  "audio/ogg":               "audio",
  // ── Video ───────────────────────────────────────────────────────────────────
  "video/mp4":               "video",
  "video/quicktime":         "video",
  "video/webm":              "video",
  "video/x-matroska":        "video",
  "video/x-msvideo":         "video",
  "video/x-m4v":             "video",
  // ── Documents ───────────────────────────────────────────────────────────────
  "application/pdf":         "document",
  "text/plain":              "document",
  "text/csv":                "document",
  "application/msword":      "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.ms-excel":"document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "application/vnd.ms-powerpoint": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "document",
  // ── Design ──────────────────────────────────────────────────────────────────
  "image/vnd.adobe.photoshop": "design",
  "application/illustrator":   "design",
  "application/postscript":    "design",
  "application/eps":           "design",
  "application/x-eps":         "design",
  // ── Archives ────────────────────────────────────────────────────────────────
  "application/zip":             "archive",
  "application/x-zip-compressed":"archive",
  "application/x-zip":           "archive",
  "application/octet-stream":    "archive", // .aif / unknown binaries — reclassify by ext below
}

// Extension fallback when MIME is ambiguous
const EXT_TO_TYPE: Record<string, AssetType> = {
  aif: "audio", aiff: "audio", m4a: "audio",
  mkv: "video", avi: "video",  m4v: "video", mov: "video",
  psd: "design", ai: "design",  eps: "design",
  zip: "archive",
  svg: "image",  tiff: "image", tif: "image", heic: "image", heif: "image",
  csv: "document", xlsx: "document", docx: "document", pptx: "document",
}

function classifyFile(mimeType: string, filename: string): AssetType {
  const fromMime = MIME_TO_TYPE[mimeType]
  if (fromMime && fromMime !== "archive") return fromMime
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  return EXT_TO_TYPE[ext] ?? fromMime ?? "document"
}

// Suggest subcategory from filename patterns
function suggestSubcategory(filename: string, type: AssetType): string | null {
  const lf = filename.toLowerCase()
  if (type === "audio") {
    if (/\bbeat|_beat/.test(lf))           return "beat"
    if (/\bmaster(ed)?\b/.test(lf))        return "master"
    if (/\bstem/.test(lf))                 return "stem"
    if (/\bvocal|vox\b/.test(lf))          return "vocal"
    if (/\bloop\b/.test(lf))               return "loop"
    if (/\bhook\b/.test(lf))               return "hook"
    if (/\bref(erence)?\b/.test(lf))       return "reference"
  }
  if (type === "image") {
    if (/thumb(nail)?/.test(lf))           return "thumbnail"
    if (/\bcover\b/.test(lf))              return "cover"
    if (/\bmerch\b/.test(lf))              return "merch"
    if (/\bmockup\b/.test(lf))             return "mockup"
    if (/artist.*(photo|pic)|photo.*artist/.test(lf)) return "artist_photo"
    if (/\bbrand\b/.test(lf))             return "brand"
  }
  if (type === "video") {
    if (/visuali[sz]er/.test(lf))         return "visualizer"
    if (/\bshort\b/.test(lf))             return "short"
    if (/\bpromo\b/.test(lf))             return "promo"
    if (/music.?video|[\b_]mv\b/.test(lf)) return "music_video"
    if (/\breel\b/.test(lf))              return "reel"
    if (/render/.test(lf))               return "render"
  }
  if (type === "archive") {
    if (/stem/.test(lf))                  return "stems_pack"
    if (/\bkit\b/.test(lf))              return "sample_kit"
  }
  return null
}

export type AssetUploadResult = { id: string; url: string; type: AssetType } | { error: string }

export async function uploadAssetFile(formData: FormData): Promise<AssetUploadResult> {
  await requireAdmin()

  const file = formData.get("file")
  if (!(file instanceof File)) return { error: "No file provided." }
  if (file.size === 0) return { error: "File is empty." }

  const assetType = classifyFile(file.type, file.name)
  const limit = SIZE_LIMIT[assetType] ?? DEFAULT_SIZE_LIMIT
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024))
    return { error: `${assetType} files must be under ${mb} MB.` }
  }

  const FOLDER_MAP: Record<AssetType, string> = {
    image: "images", audio: "audio", video: "videos",
    document: "documents", design: "design", archive: "archives",
  }
  const explicitFolder = formData.get("folder")?.toString()
  const folder = explicitFolder || (FOLDER_MAP[assetType] ?? "misc")
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

  const subcategory = suggestSubcategory(file.name, assetType)

  const { data: row, error: dbError } = await supabase
    .from("assets")
    .insert({
      type: assetType,
      url,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      subcategory,
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

  const { createInboxEntryResult } = await import("@/lib/db/audioInbox")
  const errors: string[] = []
  let queued = 0

  for (const assetId of audioIds) {
    const result = await createInboxEntryResult(assetId)
    if (result) {
      if (result.created) queued++
      import("@/app/actions/audioInbox").then(({ scoreAudioAsset }) => {
        scoreAudioAsset(result.row.id).catch(console.error)
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

  if (!error) {
    await supabase
      .from("audio_inbox")
      .update({ producer_slug: producerSlug || null, updated_at: new Date().toISOString() })
      .in("asset_id", ids)
  }

  revalidatePath("/admin/assets")
  revalidatePath("/admin/youtube/inbox")
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
