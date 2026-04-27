"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export async function createContract(formData: FormData) {
  await requireAdmin()

  const title = formData.get("title")?.toString().trim() ?? ""
  const type = formData.get("type")?.toString() ?? "recording"
  const status = formData.get("status")?.toString() ?? "draft"
  const artist_slug = formData.get("artist_slug")?.toString().trim() || null
  const counterparty = formData.get("counterparty")?.toString().trim() ?? ""
  const effective_date = formData.get("effective_date")?.toString() || null
  const expiry_date = formData.get("expiry_date")?.toString() || null
  const notes = formData.get("notes")?.toString().trim() ?? ""

  if (!title) throw new Error("Title is required.")

  const { error } = await supabase.from("contracts").insert({
    title,
    type,
    status,
    artist_slug,
    counterparty,
    effective_date,
    expiry_date,
    notes,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/contracts")
  redirect("/admin/contracts")
}

export async function deleteContract(id: string) {
  await requireAdmin()

  const { error } = await supabase.from("contracts").delete().eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/contracts")
}
