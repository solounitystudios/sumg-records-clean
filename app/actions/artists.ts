"use server"

import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

const BUCKET = "sumg-assets"
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])
const MAX_BYTES = 10 * 1024 * 1024

export type PhotoUploadResult = { url: string } | { error: string }

export async function uploadArtistPhoto(
  formData: FormData,
  artistSlug: string,
): Promise<PhotoUploadResult> {
  await requireAdmin()

  const file = formData.get("file")
  if (!(file instanceof File)) return { error: "No file provided." }
  if (!ALLOWED_MIME.has(file.type)) return { error: "Only JPEG, PNG, or WebP images are accepted." }
  if (file.size === 0) return { error: "File is empty." }
  if (file.size > MAX_BYTES) return { error: "Image must be under 10 MB." }

  const id = crypto.randomUUID()
  const path = `artists/${id}.jpeg`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = urlData.publicUrl

  const { error: artistError } = await supabase
    .from("artists")
    .update({ profile_image_url: url, updated_at: new Date().toISOString() })
    .eq("slug", artistSlug)

  if (artistError) return { error: artistError.message }

  // Best-effort asset registry — don't block on failure
  await supabase.from("assets").insert({
    type: "image",
    url,
    filename: `${id}.jpeg`,
    mime_type: file.type,
    size_bytes: file.size,
    attached_to: { type: "artist", slug: artistSlug },
    uploaded_by: "admin",
  })

  revalidatePath("/admin/artists")
  return { url }
}
