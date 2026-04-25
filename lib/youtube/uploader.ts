import "server-only"

export interface UploadMeta {
  title:       string
  description: string
  tags:        string[]
  categoryId?: string
  privacy?:    "public" | "unlisted" | "private"
}

export interface UploadResult {
  videoId:  string
  videoUrl: string
}

const INIT_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"

/**
 * Fetches the asset from assetUrl and uploads it to YouTube via the resumable upload API.
 *
 * Requirements:
 *   - mimeType must be video/* (YouTube does not accept audio-only files)
 *   - accessToken must be a valid YouTube Data API OAuth2 token with youtube.upload scope
 *
 * For audio-only assets: export audio + loop visual to MP4 first, upload the MP4
 * to the asset bin, then point the job to that video asset.
 */
export async function uploadToYouTube(
  accessToken: string,
  assetUrl:    string,
  mimeType:    string,
  meta:        UploadMeta,
): Promise<UploadResult> {
  if (!mimeType.startsWith("video/")) {
    throw new Error(
      `Asset MIME type "${mimeType}" cannot be uploaded to YouTube. ` +
      `YouTube requires video/mp4 (or similar). Combine your audio + visual into an MP4 first.`,
    )
  }

  // Fetch asset bytes from Supabase Storage
  const assetRes = await fetch(assetUrl, { cache: "no-store" })
  if (!assetRes.ok) {
    throw new Error(`Failed to fetch asset from storage (${assetRes.status}): ${assetUrl}`)
  }
  const assetBuffer   = await assetRes.arrayBuffer()
  const contentLength = assetBuffer.byteLength

  // 1 — Initiate resumable upload session
  const initRes = await fetch(INIT_URL, {
    method:  "POST",
    headers: {
      Authorization:              `Bearer ${accessToken}`,
      "Content-Type":             "application/json",
      "X-Upload-Content-Type":    mimeType,
      "X-Upload-Content-Length":  String(contentLength),
    },
    body: JSON.stringify({
      snippet: {
        title:       meta.title.slice(0, 100),
        description: meta.description.slice(0, 5_000),
        tags:        meta.tags.slice(0, 500),
        categoryId:  meta.categoryId ?? "10",
      },
      status: {
        privacyStatus: meta.privacy ?? "public",
      },
    }),
  })

  if (!initRes.ok) {
    const body = await initRes.text()
    throw new Error(`YouTube upload init failed (${initRes.status}): ${body}`)
  }

  const uploadUrl = initRes.headers.get("Location")
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL")

  // 2 — Upload video bytes
  const uploadRes = await fetch(uploadUrl, {
    method:  "PUT",
    headers: {
      "Content-Type":   mimeType,
      "Content-Length": String(contentLength),
    },
    body: assetBuffer,
  })

  if (!uploadRes.ok) {
    const body = await uploadRes.text()
    throw new Error(`Video upload failed (${uploadRes.status}): ${body}`)
  }

  const video = (await uploadRes.json()) as { id?: string }
  if (!video.id) throw new Error("YouTube response contained no video ID")

  return {
    videoId:  video.id,
    videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
  }
}
