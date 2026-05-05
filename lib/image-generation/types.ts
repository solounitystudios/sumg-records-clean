export type ImageProvider = "openai"

/** All sizes DALL-E 3 accepts */
export type DalleSize = "1024x1024" | "1792x1024" | "1024x1792"

export interface GenerateImageOptions {
  prompt: string
  count?: 1 | 2 | 3 | 4
  size?: DalleSize
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
