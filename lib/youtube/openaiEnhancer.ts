import "server-only"

interface EnhanceParams {
  producerName:    string
  trackName:       string
  genre:           string
  genreCore:       string[]
  soundDirection:  string | null
  identitySummary: string | null
}

export interface EnhancedMetadata {
  titles:      string[]
  description: string
  tags:        string[]
}

export async function enhanceMetadataWithOpenAI(
  params: EnhanceParams,
): Promise<EnhancedMetadata | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const { producerName, trackName, genre, genreCore, soundDirection, identitySummary } = params
  const year = new Date().getFullYear()

  const context = [
    `Producer: ${producerName}`,
    `Track name: ${trackName}`,
    `Genre: ${genre}`,
    genreCore.length > 1 ? `Related genres: ${genreCore.slice(1).join(", ")}` : null,
    `Year: ${year}`,
    soundDirection   ? `Sound direction: ${soundDirection}`   : null,
    identitySummary  ? `Artist identity: ${identitySummary}`  : null,
  ].filter(Boolean).join("\n")

  const prompt = `You are a YouTube SEO expert for a beat music label.

Return a JSON object with exactly these keys:
- "titles": array of exactly 3 YouTube video titles (40–65 chars each). At least one must start with "[FREE]". Each must contain "type beat" or the genre name.
- "description": 200–350 character YouTube video description. Natural, keyword-rich. No URLs, no emojis.
- "tags": array of 20–30 lowercase tag strings. No hashtags.

${context}

Respond with JSON only.`

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:           "gpt-4o-mini",
        messages:        [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens:      600,
        temperature:     0.7,
      }),
      signal: AbortSignal.timeout(12_000),
    })

    if (!resp.ok) return null

    const json = await resp.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = json.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as Record<string, unknown>

    const titles      = parsed.titles
    const description = parsed.description
    const tags        = parsed.tags

    if (
      !Array.isArray(titles) || titles.length === 0 ||
      typeof description !== "string" || !description.trim() ||
      !Array.isArray(tags)
    ) return null

    return {
      titles:      (titles as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 3),
      description: description.trim().slice(0, 5_000),
      tags:        (tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 30),
    }
  } catch {
    return null
  }
}
