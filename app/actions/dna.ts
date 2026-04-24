"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"

function parseJSONField(value: string | null): Record<string, unknown> | null {
  if (!value || value.trim() === "") return null
  try { return JSON.parse(value) } catch { return null }
}

function parseArrayField(value: string | null): string[] {
  if (!value || value.trim() === "") return []
  return value.split("\n").map(s => s.trim()).filter(Boolean)
}

export async function updateDNARecord(id: string, formData: FormData) {
  await requireAdmin()

  const update: Record<string, unknown> = {
    name:              formData.get("name")?.toString() ?? "",
    status:            formData.get("status")?.toString() ?? "active",
    priority_level:    formData.get("priority_level")?.toString() ?? "high",
    archetype:         formData.get("archetype")?.toString() || null,
    brand_positioning: formData.get("brand_positioning")?.toString() || null,
    identity_summary:  formData.get("identity_summary")?.toString() || null,
    notes:             formData.get("notes")?.toString() || null,

    genre_core:            parseArrayField(formData.get("genre_core")?.toString() ?? null),
    genre_secondary:       parseArrayField(formData.get("genre_secondary")?.toString() ?? null),
    emotional_targets:     parseArrayField(formData.get("emotional_targets")?.toString() ?? null),
    mix_energy:            parseArrayField(formData.get("mix_energy")?.toString() ?? null),
    key_preferences:       parseArrayField(formData.get("key_preferences")?.toString() ?? null),
    forbidden_elements:    parseArrayField(formData.get("forbidden_elements")?.toString() ?? null),
    best_producer_matches: parseArrayField(formData.get("best_producer_matches")?.toString() ?? null),
    best_artist_matches:   parseArrayField(formData.get("best_artist_matches")?.toString() ?? null),
    metadata_keywords:     parseArrayField(formData.get("metadata_keywords")?.toString() ?? null),

    audience_profile:     parseJSONField(formData.get("audience_profile")?.toString() ?? null),
    tempo_range:          parseJSONField(formData.get("tempo_range")?.toString() ?? null),
    vocal_dna:            parseJSONField(formData.get("vocal_dna")?.toString() ?? null),
    lyrical_dna:          parseJSONField(formData.get("lyrical_dna")?.toString() ?? null),
    arrangement_dna:      parseJSONField(formData.get("arrangement_dna")?.toString() ?? null),
    instrumentation_rules: parseJSONField(formData.get("instrumentation_rules")?.toString() ?? null),
    fx_language:          parseJSONField(formData.get("fx_language")?.toString() ?? null),
    suno_metatag_rules:   parseJSONField(formData.get("suno_metatag_rules")?.toString() ?? null),
    visual_dna:           parseJSONField(formData.get("visual_dna")?.toString() ?? null),
    cover_art_dna:        parseJSONField(formData.get("cover_art_dna")?.toString() ?? null),
    video_dna:            parseJSONField(formData.get("video_dna")?.toString() ?? null),
    rollout_dna:          parseJSONField(formData.get("rollout_dna")?.toString() ?? null),
    youtube_packaging_dna: parseJSONField(formData.get("youtube_packaging_dna")?.toString() ?? null),

    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("dna_records").update(update).eq("id", id)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/dna", "layout")

  const entityType = formData.get("entity_type")?.toString() ?? "artist"
  const slug = formData.get("slug")?.toString() ?? ""
  redirect(`/admin/dna/${entityType}/${slug}`)
}

export async function createDNARecord(formData: FormData) {
  await requireAdmin()

  const name = formData.get("name")?.toString() ?? ""
  const entityType = formData.get("entity_type")?.toString() ?? "artist"
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

  const { error } = await supabase.from("dna_records").insert({
    name,
    entity_type: entityType,
    slug,
    status: formData.get("status")?.toString() ?? "active",
    priority_level: formData.get("priority_level")?.toString() ?? "high",
    archetype: formData.get("archetype")?.toString() || null,
    brand_positioning: formData.get("brand_positioning")?.toString() || null,
    identity_summary: formData.get("identity_summary")?.toString() || null,
    notes: formData.get("notes")?.toString() || null,
  })
  if (error) throw new Error(error.message)

  revalidatePath("/admin/dna", "layout")
  redirect(`/admin/dna/${entityType}/${slug}/edit`)
}
