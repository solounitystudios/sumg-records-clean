import { supabase } from "./supabase"

export type Contract = {
  id: string
  title: string
  type: string
  status: string
  artistSlug: string | null
  counterparty: string
  effectiveDate: string | null
  expiryDate: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export type ContractTemplate = {
  id: string
  name: string
  type: string
  bodyText: string
  createdAt: string
}

function toContract(row: Record<string, any>): Contract {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    artistSlug: row.artist_slug ?? null,
    counterparty: row.counterparty ?? "",
    effectiveDate: row.effective_date ?? null,
    expiryDate: row.expiry_date ?? null,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toTemplate(row: Record<string, any>): ContractTemplate {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    bodyText: row.body_text ?? "",
    createdAt: row.created_at,
  }
}

export async function getContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`getContracts: ${error.message}`)
  return (data ?? []).map(toContract)
}

export async function getContractById(id: string): Promise<Contract | null> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(`getContractById: ${error.message}`)
  return data ? toContract(data) : null
}

export async function getContractTemplates(): Promise<ContractTemplate[]> {
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .order("name")
  if (error) throw new Error(`getContractTemplates: ${error.message}`)
  return (data ?? []).map(toTemplate)
}

export const CONTRACT_TYPES = [
  "recording",
  "distribution",
  "sync",
  "publishing",
  "management",
  "merchandise",
  "brand_deal",
  "nda",
] as const

export const CONTRACT_STATUSES = ["draft", "sent", "signed", "expired", "void"] as const
