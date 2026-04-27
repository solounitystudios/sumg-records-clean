"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/db/tasks"

export async function createTask(formData: FormData) {
  await requireAdmin()

  const title = formData.get("title")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""
  const status = formData.get("status")?.toString() ?? "open"
  const priority = formData.get("priority")?.toString() ?? "medium"
  const assigned_to = formData.get("assigned_to")?.toString().trim() || null
  const due_date = formData.get("due_date")?.toString() || null
  const created_by = formData.get("created_by")?.toString().trim() ?? ""

  if (!title) throw new Error("Title is required.")
  if (!(TASK_STATUSES as readonly string[]).includes(status)) throw new Error("Invalid status.")
  if (!(TASK_PRIORITIES as readonly string[]).includes(priority)) throw new Error("Invalid priority.")

  const { error } = await supabase.from("admin_tasks").insert({
    title,
    description,
    status,
    priority,
    assigned_to,
    due_date,
    created_by,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/admin/tasks")
  redirect("/admin/tasks")
}

export async function updateTaskStatus(id: string, status: string) {
  await requireAdmin()

  if (!(TASK_STATUSES as readonly string[]).includes(status)) throw new Error("Invalid status.")

  const { error } = await supabase
    .from("admin_tasks")
    .update({ status })
    .eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/tasks")
}

export async function deleteTask(id: string) {
  await requireAdmin()

  const { error } = await supabase.from("admin_tasks").delete().eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/tasks")
}
