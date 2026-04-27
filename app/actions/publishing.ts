"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export async function createPublishingWork(formData: FormData) {
  await requireAdmin()

  const title = formData.get("title")?.toString().trim() ?? ""
  const artist_slug = formData.get("artist_slug")?.toString().trim() || null
  const release_slug = formData.get("release_slug")?.toString().trim() || null
  const iswc = formData.get("iswc")?.toString().trim() ?? ""
  const pro = formData.get("pro")?.toString().trim() ?? ""
  const status = formData.get("status")?.toString() ?? "unregistered"
  const notes = formData.get("notes")?.toString().trim() ?? ""

  if (!title) throw new Error("Title is required.")

  const { error } = await supabase.from("publishing_works").insert({
    title,
    artist_slug,
    release_slug,
    iswc,
    pro,
    status,
    notes,
    writers: [],
    publishers: [],
    splits: {},
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/publishing")
  redirect("/admin/publishing")
}

export async function deletePublishingWork(id: string) {
  await requireAdmin()

  const { error } = await supabase.from("publishing_works").delete().eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/publishing")
}
