import { supabase } from "@/lib/db/supabase"
import type { Contributor } from "@/lib/types/lyrics"

const SELECT = "id, name, email, type, royalty_eligible, artist_slug, bio, created_at, updated_at"

type ContributorRow = {
  id: string
  name: string
  email: string | null
  type: string
  royalty_eligible: boolean
  artist_slug: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

function toContributor(row: ContributorRow): Contributor {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    type: row.type as Contributor["type"],
    royaltyEligible: row.royalty_eligible,
    artistSlug: row.artist_slug,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getContributors(): Promise<Contributor[]> {
  const { data, error } = await supabase
    .from("contributors")
    .select(SELECT)
    .order("name")
  if (error) throw new Error(error.message)
  return (data as ContributorRow[]).map(toContributor)
}

export async function getContributorById(id: string): Promise<Contributor | null> {
  const { data, error } = await supabase
    .from("contributors")
    .select(SELECT)
    .eq("id", id)
    .single()
  if (error) return null
  return toContributor(data as ContributorRow)
}
