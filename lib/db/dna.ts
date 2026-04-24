import { supabase } from "./supabase"

export interface DNARecord {
  id: string
  entity_type: "artist" | "producer"
  name: string
  slug: string
  status: string
  priority_level: string
  archetype: string | null
  brand_positioning: string | null
  identity_summary: string | null
  genre_core: string[]
  genre_secondary: string[]
  emotional_targets: string[]
  mix_energy: string[]
  key_preferences: string[]
  forbidden_elements: string[]
  best_producer_matches: string[]
  best_artist_matches: string[]
  metadata_keywords: string[]
  audience_profile: Record<string, unknown> | null
  tempo_range: Record<string, unknown> | null
  vocal_dna: Record<string, unknown> | null
  lyrical_dna: Record<string, unknown> | null
  arrangement_dna: Record<string, unknown> | null
  instrumentation_rules: Record<string, unknown> | null
  fx_language: Record<string, unknown> | null
  suno_metatag_rules: Record<string, unknown> | null
  visual_dna: Record<string, unknown> | null
  cover_art_dna: Record<string, unknown> | null
  video_dna: Record<string, unknown> | null
  rollout_dna: Record<string, unknown> | null
  youtube_packaging_dna: Record<string, unknown> | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getAllDNARecords(): Promise<DNARecord[]> {
  const { data, error } = await supabase
    .from("dna_records")
    .select("*")
    .order("entity_type")
    .order("name")
  if (error) throw new Error(error.message)
  return (data ?? []) as DNARecord[]
}

export async function getDNAByType(type: "artist" | "producer"): Promise<DNARecord[]> {
  const { data, error } = await supabase
    .from("dna_records")
    .select("*")
    .eq("entity_type", type)
    .order("name")
  if (error) throw new Error(error.message)
  return (data ?? []) as DNARecord[]
}

export async function getDNABySlug(type: "artist" | "producer", slug: string): Promise<DNARecord | null> {
  const { data, error } = await supabase
    .from("dna_records")
    .select("*")
    .eq("entity_type", type)
    .eq("slug", slug)
    .single()
  if (error) return null
  return data as DNARecord
}
