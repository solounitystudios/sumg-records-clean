"use server"

import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

const BUCKET = "sumg-assets"
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export type UploadResult = { url: string; path: string } | { error: string }

/**
 * Upload an image to Supabase Storage.
 *
 * FormData fields:
 *   file   — the image File object (required)
 *   folder — storage subfolder, e.g. "artists" or "releases" (optional, default "uploads")
 *
 * Storage path is always <folder>/<uuid>.jpeg so filenames are consistent
 * regardless of the original extension (.jpg / .png / .webp all become .jpeg).
 * The actual MIME type of the uploaded bytes is preserved in the assets table.
 *
 * Returns the public URL on success, or an error string on failure.
 * Requires an admin session.
 */
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  await requireAdmin()

  const file = formData.get("file")
  if (!(file instanceof File)) return { error: "No file provided." }

  if (!ALLOWED_MIME.has(file.type)) {
    return { error: "Only JPEG, PNG, and WebP images are accepted." }
  }

  if (file.size === 0) return { error: "File is empty." }
  if (file.size > MAX_BYTES) return { error: "Image must be under 10 MB." }

  const folder = formData.get("folder")?.toString().replace(/[^a-z0-9_-]/gi, "") || "uploads"
  const id = crypto.randomUUID()
  const path = `${folder}/${id}.jpeg`

  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { error: dbError } = await supabase.from("assets").insert({
    type: "image",
    url: urlData.publicUrl,
    filename: `${id}.jpeg`,
    mime_type: file.type,
    size_bytes: file.size,
    attached_to: null,
    uploaded_by: "admin",
  })

  if (dbError) {
    // Storage write succeeded; best-effort DB insert. Log and continue —
    // the URL is valid even if the assets row is missing.
    console.error("assets insert failed:", dbError.message)
  }

  return { url: urlData.publicUrl, path }
}
