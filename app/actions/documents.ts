"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export async function createDocument(formData: FormData) {
  await requireAdmin()

  const title = formData.get("title")?.toString().trim() ?? ""
  const category = formData.get("category")?.toString() ?? "other"
  const status = formData.get("status")?.toString() ?? "active"
  const artist_slug = formData.get("artist_slug")?.toString().trim() || null
  const release_slug = formData.get("release_slug")?.toString().trim() || null
  const description = formData.get("description")?.toString().trim() ?? ""
  const file_url = formData.get("file_url")?.toString().trim() ?? ""
  const file_name = formData.get("file_name")?.toString().trim() ?? ""

  if (!title) throw new Error("Title is required.")

  const { error } = await supabase.from("documents").insert({
    title,
    category,
    status,
    artist_slug,
    release_slug,
    description,
    file_url,
    file_name,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/documents")
  redirect("/admin/documents")
}

export async function deleteDocument(id: string) {
  await requireAdmin()

  const { error } = await supabase.from("documents").delete().eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/documents")
}
