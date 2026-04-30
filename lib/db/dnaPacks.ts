import { supabase } from "./supabase"

export interface ProducerVariation {
  id: string
  producer_slug: string
  variation_name: string
  visual_world: string | null
  colors: string[]
  image_prompt: string | null
  yt_title_formula: string | null
  description_style: string | null
  tag_bank: string[]
  best_artist_pairings: string[]
  sound_direction: string | null
  forbidden_elements: string[]
  sort_order:       number
  is_default:       boolean
  routing_priority: number
  created_at:       string
}

export interface DNAPack {
  id: string
  title: string
  status: "draft" | "approved" | "assigned_to_queue"
  artist_dna_id: string | null
  producer_dna_id: string | null
  producer_variation_id: string | null
  asset_id: string | null
  yt_job_id: string | null
  platform: string
  upload_type: string | null
  target_audience: string | null
  song_mood: string | null
  song_prompt: string | null
  suno_metatags: string | null
  title_ideas: string | null
  thumbnail_prompt: string | null
  yt_description: string | null
  hashtags: string[]
  visual_direction: string | null
  rollout_notes: string | null
  created_at: string
  updated_at: string
}

export async function getAllVariations(): Promise<ProducerVariation[]> {
  const { data, error } = await supabase
    .from("producer_variations")
    .select("*")
    .order("producer_slug")
    .order("sort_order")
  if (error) throw new Error(error.message)
  return (data ?? []) as ProducerVariation[]
}

export async function getPackById(id: string): Promise<DNAPack | null> {
  const { data, error } = await supabase
    .from("dna_packs")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return data as DNAPack
}

export async function getAllPacks(): Promise<DNAPack[]> {
  const { data, error } = await supabase
    .from("dna_packs")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as DNAPack[]
}
