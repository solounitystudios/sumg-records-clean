import { supabase } from "./supabase"

export type FinanceTransaction = {
  id: string
  type: "income" | "expense"
  category: string
  amount: number
  currency: string
  transactionDate: string
  description: string
  artistSlug: string | null
  releaseSlug: string | null
  notes: string
  createdAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTransaction(row: Record<string, any>): FinanceTransaction {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    amount: row.amount,
    currency: row.currency ?? "USD",
    transactionDate: row.transaction_date,
    description: row.description ?? "",
    artistSlug: row.artist_slug ?? null,
    releaseSlug: row.release_slug ?? null,
    notes: row.notes ?? "",
    createdAt: row.created_at,
  }
}

export async function getTransactions(): Promise<FinanceTransaction[]> {
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
  if (error) throw new Error(`getTransactions: ${error.message}`)
  return (data ?? []).map(toTransaction)
}

export async function getTransactionById(id: string): Promise<FinanceTransaction | null> {
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(`getTransactionById: ${error.message}`)
  return data ? toTransaction(data) : null
}

export const INCOME_CATEGORIES = [
  "streaming_royalties",
  "sync_licensing",
  "merchandise",
  "live_performance",
  "publishing_royalties",
  "brand_deal",
  "advance",
  "other_income",
] as const

export const EXPENSE_CATEGORIES = [
  "studio_time",
  "mixing_mastering",
  "distribution",
  "marketing",
  "equipment",
  "travel",
  "legal_accounting",
  "other_expense",
] as const

export function categoryLabel(c: string): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}
