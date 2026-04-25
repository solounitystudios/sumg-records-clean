"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"

export interface SavePackInput {
  title: string
  artist_dna_id: string
  producer_dna_id: string
  producer_variation_id: string
  platform: string
  upload_type: string | null
  song_prompt: string
  suno_metatags: string
  title_ideas: string
  thumbnail_prompt: string
  yt_description: string
  hashtags: string[]
  visual_direction: string
  status: "draft" | "approved" | "assigned_to_queue"
}

export async function saveDNAPack(input: SavePackInput): Promise<{ id: string }> {
  await requireAdmin()

  const { data, error } = await supabase
    .from("dna_packs")
    .insert({
      title: input.title,
      status: input.status,
      artist_dna_id: input.artist_dna_id || null,
      producer_dna_id: input.producer_dna_id || null,
      producer_variation_id: input.producer_variation_id || null,
      platform: input.platform || "youtube_beat",
      upload_type: input.upload_type || null,
      song_prompt: input.song_prompt || null,
      suno_metatags: input.suno_metatags || null,
      title_ideas: input.title_ideas || null,
      thumbnail_prompt: input.thumbnail_prompt || null,
      yt_description: input.yt_description || null,
      hashtags: input.hashtags || [],
      visual_direction: input.visual_direction || null,
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/admin/dna/packs")
  return { id: data.id }
}

export async function updatePackStatus(
  id: string,
  status: "draft" | "approved" | "assigned_to_queue",
): Promise<void> {
  await requireAdmin()

  const { error } = await supabase
    .from("dna_packs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/dna/packs")
}

export async function deletePack(formData: FormData): Promise<void> {
  await requireAdmin()

  const id = formData.get("id")?.toString() ?? ""
  const { error } = await supabase.from("dna_packs").delete().eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/dna/packs")
}
