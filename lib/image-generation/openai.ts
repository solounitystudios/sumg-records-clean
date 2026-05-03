import OpenAI from "openai"
import type { GenerateImageOptions, GenerateImageResult } from "./types"

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _client
}

export async function generateWithOpenAI(opts: GenerateImageOptions): Promise<GenerateImageResult> {
  const client = getClient()
  const count = Math.min(opts.count ?? 1, 4)
  const images: Array<{ url: string; revisedPrompt?: string }> = []

  for (let i = 0; i < count; i++) {
    const response = await client.images.generate({
      model:           "dall-e-3",
      prompt:          opts.prompt,
      n:               1,
      size:            opts.size ?? "1792x1024",
      quality:         opts.quality ?? "hd",
      style:           opts.style ?? "vivid",
      response_format: "url",
    })
    const img = response.data?.[0]
    if (img?.url) {
      images.push({ url: img.url, revisedPrompt: img.revised_prompt ?? undefined })
    }
  }

  return { images, provider: "openai" }
}
