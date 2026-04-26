"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"

// All song mutations require owner, co_owner, or admin — enforced by requireAdmin()

export async function archiveSong(id: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("songs")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/releases")
  revalidatePath("/songs")
  redirect("/admin/releases")
}

export async function restoreSong(id: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("songs")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/releases")
  revalidatePath("/songs")
  redirect("/admin/releases")
}

export async function deleteSong(id: string): Promise<void> {
  await requireAdmin()
  const { error } = await supabase
    .from("songs")
    .delete()
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/releases")
  revalidatePath("/songs")
  redirect("/admin/releases")
}
