"use server"

import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { generateWithOpenAI, isImageGenerationConfigured } from "@/lib/image-generation"

export interface GeneratedThumbnailImage {
  imageUrl:      string
  assetId:       string
  revisedPrompt?: string
}

export interface ThumbnailGenerationResult {
  images: GeneratedThumbnailImage[]
}

export async function generateThumbnailImages({
  prompt,
  count = 1,
  producerSlug,
  projectId,
}: {
  prompt:       string
  count?:       1 | 2 | 3 | 4
  producerSlug?: string
  projectId?:   string
}): Promise<ThumbnailGenerationResult | { error: string }> {
  await requireAdmin()

  if (!isImageGenerationConfigured()) {
    return {
      error: "OPENAI_API_KEY is not configured. Add it to your environment variables to enable direct image generation.",
    }
  }

  if (!prompt.trim()) {
    return { error: "A prompt is required to generate images." }
  }

  try {
    const result = await generateWithOpenAI({
      prompt,
      count,
      size:    "1792x1024",
      quality: "hd",
      style:   "vivid",
    })

    const supabase = await createClient()
    const images: GeneratedThumbnailImage[] = []

    // Get current max version_number for this project (if provided)
    let nextVersionNum = 1
    if (projectId) {
      const { data: maxVer } = await supabase
        .from("thumbnail_versions")
        .select("version_number")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false })
        .limit(1)
      nextVersionNum = ((maxVer?.[0] as { version_number: number } | undefined)?.version_number ?? 0) + 1
    }

    for (const img of result.images) {
      const filename = `thumbnail_ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`

      // Save to assets table
      const { data: assetRow, error: assetErr } = await supabase
        .from("assets")
        .insert({
          type:          "image",
          url:           img.url,
          filename,
          mime_type:     "image/png",
          size_bytes:    null,
          alt_text:      "AI generated thumbnail",
          attached_to:   null,
          uploaded_by:   "thumbnail_studio_openai",
          producer_slug: producerSlug ?? null,
          status:        "ready",
          tags:          ["thumbnail", "ai-generated", "openai"],
        })
        .select("id")
        .single()

      if (assetErr) {
        console.error("[generateThumbnailImages] asset insert failed:", assetErr.message)
        continue
      }

      const assetId = (assetRow as { id: string }).id

      // Record in thumbnail_assets for the library
      await supabase.from("thumbnail_assets").insert({
        producer_slug:        producerSlug ?? null,
        image_url:            img.url,
        prompt_used:          img.revisedPrompt ?? prompt,
        asset_id:             assetId,
        name:                 `AI Generated — ${new Date().toLocaleDateString()}`,
        linked_upload_job_id: null,
      })

      // Attach as a version to the project if specified
      if (projectId) {
        await supabase.from("thumbnail_versions").insert({
          project_id:     projectId,
          image_url:      img.url,
          asset_id:       assetId,
          prompt:         img.revisedPrompt ?? prompt,
          provider:       "openai",
          style_bucket:   null,
          version_number: nextVersionNum++,
        })
      }

      images.push({ imageUrl: img.url, assetId, revisedPrompt: img.revisedPrompt })
    }

    if (images.length === 0) {
      return { error: "No images were generated. Check the prompt and try again." }
    }

    return { images }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: `Generation failed: ${msg}` }
  }
}
