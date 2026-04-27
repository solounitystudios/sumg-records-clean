import { supabase } from "./supabase"

export type Document = {
  id: string
  title: string
  category: string
  status: string
  artistSlug: string | null
  releaseSlug: string | null
  contractId: string | null
  description: string
  fileUrl: string
  fileName: string
  fileSize: number | null
  mimeType: string | null
  createdAt: string
  updatedAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDocument(row: Record<string, any>): Document {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? "other",
    status: row.status ?? "active",
    artistSlug: row.artist_slug ?? null,
    releaseSlug: row.release_slug ?? null,
    contractId: row.contract_id ?? null,
    description: row.description ?? "",
    fileUrl: row.file_url ?? "",
    fileName: row.file_name ?? "",
    fileSize: row.file_size ?? null,
    mimeType: row.mime_type ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`getDocuments: ${error.message}`)
  return (data ?? []).map(toDocument)
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(`getDocumentById: ${error.message}`)
  return data ? toDocument(data) : null
}

export const DOCUMENT_CATEGORIES = [
  "party",
  "project",
  "release",
  "contract",
  "task",
  "legal",
  "other",
] as const

export const DOCUMENT_STATUSES = [
  "pending",
  "active",
  "signed",
  "expired",
  "archived",
  "needs_review",
  "rejected",
] as const
