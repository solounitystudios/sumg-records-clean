import { supabase } from "./supabase"
import type { NewsItem } from "@/lib/data"

const SELECT = "id, slug, title, excerpt, date, category, featured"

type NewsRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  date: string
  category: string
  featured: boolean
}

function toNewsItem(row: NewsRow): NewsItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    date: row.date,
    category: row.category,
    featured: row.featured,
  }
}

export async function getNews(): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from("news")
    .select(SELECT)
    .order("sort_order")
  if (error) {
    console.error("[db] news:", error.message)
    return []
  }
  return (data as NewsRow[]).map(toNewsItem)
}
