"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

export async function createThread(formData: FormData) {
  await requireAdmin()

  const subject = formData.get("subject")?.toString().trim() ?? ""
  const created_by = formData.get("created_by")?.toString().trim() ?? ""
  const entity_type = formData.get("entity_type")?.toString().trim() || null
  const entity_id = formData.get("entity_id")?.toString().trim() || null

  if (!subject || !created_by) throw new Error("Subject and sender are required.")

  const { error } = await supabase.from("message_threads").insert({
    subject,
    created_by,
    entity_type,
    entity_id,
    is_archived: false,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/messages")
  redirect("/admin/messages")
}

export async function archiveThread(id: string) {
  await requireAdmin()

  const { error } = await supabase
    .from("message_threads")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/messages")
}

export async function deleteThread(id: string) {
  await requireAdmin()

  const { error } = await supabase.from("message_threads").delete().eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/messages")
}
