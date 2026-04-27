import { supabase } from "./supabase"

export type AdminTask = {
  id: string
  title: string
  description: string
  status: "open" | "in_progress" | "blocked" | "done"
  priority: "low" | "medium" | "high" | "urgent"
  assignedTo: string | null
  entityType: string | null
  entityId: string | null
  dueDate: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTask(row: Record<string, any>): AdminTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    status: row.status ?? "open",
    priority: row.priority ?? "medium",
    assignedTo: row.assigned_to ?? null,
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    dueDate: row.due_date ?? null,
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getTasks(): Promise<AdminTask[]> {
  const { data, error } = await supabase
    .from("admin_tasks")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) throw new Error(`getTasks: ${error.message}`)
  return (data ?? []).map(toTask)
}

export async function getTaskById(id: string): Promise<AdminTask | null> {
  const { data, error } = await supabase
    .from("admin_tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(`getTaskById: ${error.message}`)
  return data ? toTask(data) : null
}

export const TASK_STATUSES = ["open", "in_progress", "blocked", "done"] as const
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const
