export { generateWithOpenAI } from "./openai"
export * from "./types"

export function isImageGenerationConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}
