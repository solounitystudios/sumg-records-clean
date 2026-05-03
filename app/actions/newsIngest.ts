"use server"

import { requireAdmin } from "@/lib/auth"

export interface IngestedItem {
  title: string
  url: string
  excerpt: string
  date: string
  source: string
  suggestedCategory: "Release" | "Announcement" | "Business" | "Visual" | "Brand"
}

const FEEDS: { name: string; url: string; category: IngestedItem["suggestedCategory"] }[] = [
  { name: "Pitchfork",    url: "https://pitchfork.com/rss/news/feed.json", category: "Announcement" },
  { name: "Billboard",    url: "https://www.billboard.com/feed/",          category: "Business" },
  { name: "Rolling Stone",url: "https://www.rollingstone.com/music/feed/", category: "Release" },
  { name: "The FADER",    url: "https://www.thefader.com/rss",             category: "Release" },
  { name: "Hypebeast",    url: "https://hypebeast.com/music/feed",         category: "Visual" },
]

function parseXMLFeed(xml: string, sourceName: string, category: IngestedItem["suggestedCategory"]): IngestedItem[] {
  const items: IngestedItem[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]

    const title   = stripTags(extract(block, "title"))
    const link    = extract(block, "link") || extract(block, "guid")
    const desc    = stripTags(extract(block, "description")).slice(0, 220)
    const pubDate = extract(block, "pubDate")

    if (!title || !link) continue

    let dateStr = ""
    if (pubDate) {
      const d = new Date(pubDate)
      if (!isNaN(d.getTime())) dateStr = d.toISOString().slice(0, 10)
    }
    if (!dateStr) dateStr = new Date().toISOString().slice(0, 10)

    items.push({
      title: title.trim(),
      url: link.trim(),
      excerpt: desc.trim() || title.trim(),
      date: dateStr,
      source: sourceName,
      suggestedCategory: category,
    })

    if (items.length >= 5) break
  }

  return items
}

function parseJSONFeed(json: string, sourceName: string, category: IngestedItem["suggestedCategory"]): IngestedItem[] {
  try {
    const data = JSON.parse(json)
    const feedItems: unknown[] = data.items ?? []
    return feedItems.slice(0, 5).map((item: unknown) => {
      const it = item as Record<string, unknown>
      const dateStr = it.date_published
        ? new Date(it.date_published as string).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      return {
        title: String(it.title ?? ""),
        url: String(it.url ?? it.external_url ?? ""),
        excerpt: stripTags(String(it.summary ?? it.content_text ?? "")).slice(0, 220),
        date: dateStr,
        source: sourceName,
        suggestedCategory: category,
      }
    }).filter(i => i.title && i.url)
  } catch {
    return []
  }
}

function extract(html: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  const m = html.match(re)
  if (!m) return ""
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim()
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

export async function fetchIndustryNewsFeeds(): Promise<{
  items: IngestedItem[]
  errors: { source: string; error: string }[]
}> {
  await requireAdmin()

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "SUMG-Records-Admin/1.0" },
        next: { revalidate: 900 },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()

      const isJson = text.trimStart().startsWith("{")
      return isJson
        ? parseJSONFeed(text, feed.name, feed.category)
        : parseXMLFeed(text, feed.name, feed.category)
    })
  )

  const items: IngestedItem[] = []
  const errors: { source: string; error: string }[] = []

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      items.push(...result.value)
    } else {
      errors.push({ source: FEEDS[i].name, error: String(result.reason) })
    }
  })

  // Sort by date descending
  items.sort((a, b) => b.date.localeCompare(a.date))

  return { items, errors }
}
