import { CMSAsset, AssetType, UploadResult } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

// ─── Constants ───────────────────────────────────────────────────────────────

export const MEDIA_BUCKET = "media";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ACCEPTED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/aac", "audio/ogg"];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10 MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024;  // 500 MB
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024;  // 100 MB

// ─── Helpers ─────────────────────────────────────────────────────────────────

function typeFolder(type: AssetType): string {
  switch (type) {
    case "image":    return "images";
    case "video":    return "videos";
    case "audio":    return "audio";
    case "document": return "documents";
  }
}

function storagePath(type: AssetType, filename: string): string {
  const ts = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${typeFolder(type)}/${ts}-${safe}`;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Uploads a file to Supabase Storage (bucket: "media") and returns a CMSAsset.
 * If Supabase is not configured the call returns an error result immediately.
 */
export async function uploadAsset(
  file: File,
  type: AssetType,
  uploadedBy: string
): Promise<UploadResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { success: false, error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL." };
  }

  const sb = createClient();
  const path = storagePath(type, file.name);

  const { error: uploadError } = await sb.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const asset: Omit<CMSAsset, "id" | "createdAt"> = {
    type,
    url: publicUrl,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    uploadedBy,
  };

  return { success: true, asset: { ...asset, id: path, createdAt: new Date().toISOString() } };
}

// ─── Replace ──────────────────────────────────────────────────────────────────

/**
 * Replaces an existing asset file in storage.
 * The old storage path is derived from the asset's URL.
 */
export async function replaceAsset(
  existingAsset: CMSAsset,
  file: File
): Promise<UploadResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { success: false, error: "Supabase is not configured." };
  }

  const sb = createClient();
  const path = storagePath(existingAsset.type, file.name);

  // Upload new file
  const { error: uploadError } = await sb.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  // Optionally archive old file (rename to archive/ prefix)
  const oldPath = existingAsset.url.split(`/${MEDIA_BUCKET}/`)[1];
  if (oldPath) {
    await sb.storage.from(MEDIA_BUCKET).move(oldPath, `archive/${oldPath}`);
  }

  const { data: urlData } = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const updated: CMSAsset = {
    ...existingAsset,
    url: urlData.publicUrl,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };

  return { success: true, asset: updated };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Removes a file from Supabase Storage.
 * The storage path is extracted from the public URL.
 */
export async function deleteAsset(asset: CMSAsset): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  const sb = createClient();
  const path = asset.url.split(`/${MEDIA_BUCKET}/`)[1];
  if (!path) return false;

  const { error } = await sb.storage.from(MEDIA_BUCKET).remove([path]);
  return !error;
}

// ─── URL helper ───────────────────────────────────────────────────────────────

export function getAssetUrl(path: string, bucket = MEDIA_BUCKET): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return `/api/media/${bucket}/${path}`;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

// Re-export type to avoid import-cycle issues in consumers
export type { CMSAsset };

