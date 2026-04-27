import { supabase } from "./supabase"

export type MessageThread = {
  id: string
  subject: string
  entityType: string | null
  entityId: string | null
  createdBy: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
  messageCount?: number
}

export type Message = {
  id: string
  threadId: string
  body: string
  senderName: string
  createdAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toThread(row: Record<string, any>): MessageThread {
  return {
    id: row.id,
    subject: row.subject,
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    createdBy: row.created_by ?? "",
    isArchived: row.is_archived ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: row.message_count ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMessage(row: Record<string, any>): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    body: row.body,
    senderName: row.sender_name ?? "",
    createdAt: row.created_at,
  }
}

export async function getThreads(): Promise<MessageThread[]> {
  const { data, error } = await supabase
    .from("message_threads")
    .select("*, message_messages(count)")
    .order("updated_at", { ascending: false })
  if (error) throw new Error(`getThreads: ${error.message}`)
  return (data ?? []).map((row) => ({
    ...toThread(row),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageCount: (row as any).message_messages?.[0]?.count ?? 0,
  }))
}

export async function getThreadWithMessages(
  id: string
): Promise<{ thread: MessageThread; messages: Message[] } | null> {
  const [threadRes, messagesRes] = await Promise.all([
    supabase.from("message_threads").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("message_messages")
      .select("*")
      .eq("thread_id", id)
      .order("created_at", { ascending: true }),
  ])
  if (threadRes.error) throw new Error(threadRes.error.message)
  if (!threadRes.data) return null
  return {
    thread: toThread(threadRes.data),
    messages: (messagesRes.data ?? []).map(toMessage),
  }
}
