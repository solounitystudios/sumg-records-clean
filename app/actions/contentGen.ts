"use server"

import Anthropic from "@anthropic-ai/sdk"
import { requireAdmin } from "@/lib/auth"

export interface ContentGenInput {
  artistName: string
  releaseName: string
  releaseType: string
  genre: string
  bio: string
}

export interface ContentGenOutput {
  igCaption: string
  tiktokCaption: string
  xPost: string
  youtubeDescription: string
  hashtags: string[]
  pressRelease: string
}

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a world-class music marketing copywriter for SUMG Records — a premium independent label known for dark, cinematic, luxury-coded releases. You write copy that feels elite: concise, atmospheric, and culturally sharp. Never cringe. Never generic. Every caption should feel like it belongs on an Apple Music editorial or a Supreme drop announcement.

Rules:
- Instagram captions: 2–4 lines max, hook first, subtle CTA, no hashtags in body
- TikTok captions: punchy, trend-aware, call-to-action, 1–3 lines
- X posts: 240 chars max, opinionated, sharp, no fluff
- YouTube descriptions: 150–250 words, SEO-aware, atmospheric, includes [links] placeholders
- Hashtags: 8–12 relevant tags, mix of broad (#music) and niche (#beatmaker)
- Press release: 200–300 words, third-person, journalistic, includes boilerplate placeholder`

export async function generateMarketingCopy(input: ContentGenInput): Promise<ContentGenOutput> {
  await requireAdmin()

  const userPrompt = `Generate marketing copy for this release:

Artist: ${input.artistName}
Release: ${input.releaseName}
Type: ${input.releaseType}
Genre: ${input.genre}
Artist Bio: ${input.bio}

Return a JSON object with exactly these keys: igCaption, tiktokCaption, xPost, youtubeDescription, hashtags (array), pressRelease.`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  })

  const text = response.content.find((b) => b.type === "text")?.text ?? ""

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Model did not return valid JSON")

  const parsed = JSON.parse(jsonMatch[0]) as ContentGenOutput
  return parsed
}
