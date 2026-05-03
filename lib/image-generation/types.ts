export type ImageProvider = "openai"

export interface GenerateImageOptions {
  prompt: string
  count?: 1 | 2 | 3 | 4
  /** DALL-E 3 only: 1024x1024 or 1792x1024 (landscape, best for thumbnails) */
  size?: "1024x1024" | "1792x1024"
  quality?: "standard" | "hd"
  style?: "natural" | "vivid"
}

export interface GeneratedImage {
  url: string
  revisedPrompt?: string
}

export interface GenerateImageResult {
  images: GeneratedImage[]
  provider: ImageProvider
}
