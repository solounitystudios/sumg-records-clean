"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export async function createNewsItem(formData: FormData) {
  await requireAdmin()

  const title = formData.get("title")?.toString().trim() ?? ""
  const slug = formData.get("slug")?.toString().trim() ?? ""
  const excerpt = formData.get("excerpt")?.toString().trim() ?? ""
  const date = formData.get("date")?.toString() ?? ""
  const category = formData.get("category")?.toString() ?? "Announcement"
  const featured = formData.get("featured") === "on"

  if (!title || !slug || !excerpt || !date) {
    throw new Error("Title, slug, excerpt, and date are required.")
  }

  const { error } = await supabase.from("news").insert({
    id: crypto.randomUUID(),
    slug,
    title,
    excerpt,
    date,
    category,
    featured,
    sort_order: 0,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/news")
  revalidatePath("/news")
  redirect("/admin/news")
}

export async function updateNewsItem(id: string, formData: FormData) {
  await requireAdmin()

  const title = formData.get("title")?.toString().trim() ?? ""
  const excerpt = formData.get("excerpt")?.toString().trim() ?? ""
  const date = formData.get("date")?.toString() ?? ""
  const category = formData.get("category")?.toString() ?? "Announcement"
  const featured = formData.get("featured") === "on"

  if (!title || !excerpt || !date) throw new Error("Title, excerpt, and date are required.")

  const { error } = await supabase
    .from("news")
    .update({ title, excerpt, date, category, featured })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/news")
  revalidatePath("/news")
  redirect("/admin/news")
}

export async function deleteNewsItem(id: string) {
  await requireAdmin()

  const { error } = await supabase.from("news").delete().eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/news")
  revalidatePath("/news")
}
