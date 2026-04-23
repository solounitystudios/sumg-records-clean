import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

const CMS_ROLES = ["admin", "editor", "media_manager", "release_manager"] as const

export interface AuthUser {
  id: string
  email: string | undefined
  role: string
  // Populated from app_metadata.artist_slug for artist accounts.
  // Set this in Supabase Auth admin when provisioning artist users.
  artistSlug: string | null
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: (user.app_metadata?.role as string | undefined) ?? "",
    artistSlug: (user.app_metadata?.artist_slug as string | null) ?? null,
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return toAuthUser(user)
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  return user
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect("/login?error=no_role")
  return user
}

export function isCmsRole(role: string): boolean {
  return CMS_ROLES.includes(role as (typeof CMS_ROLES)[number])
}
