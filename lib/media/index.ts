import { CMSAsset, AssetType, UploadResult } from "@/lib/types";

// Placeholder implementations — wire to Supabase Storage or S3 in Phase 4

export async function uploadAsset(
  _file: File,
  _type: AssetType,
  _uploadedBy: string
): Promise<UploadResult> {
  // TODO: implement actual upload (Supabase Storage, S3, etc.)
  return { success: false, error: "Media upload not yet configured." };
}

export async function replaceAsset(
  _existingAssetId: string,
  _file: File
): Promise<UploadResult> {
  // TODO: implement replace
  return { success: false, error: "Media replace not yet configured." };
}

export async function deleteAsset(_assetId: string): Promise<boolean> {
  // TODO: implement delete
  return false;
}

export function getAssetUrl(path: string, bucket = "public"): string {
  // TODO: return actual CDN/storage URL
  return `/api/media/${bucket}/${path}`;
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ACCEPTED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/aac", "audio/ogg"];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB

// Suppress unused import warning — CMSAsset is used as return type via UploadResult
export type { CMSAsset };
