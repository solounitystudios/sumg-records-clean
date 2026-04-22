"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { encodeSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/session"
import type { Role } from "@/lib/session"
import { getArtists } from "@/lib/db/artists"

// Minimum milliseconds every login response takes, regardless of outcome.
// This slows brute-force and masks username-existence timing differences.
// For production, add request-level rate limiting via Upstash Rate Limit
// or a WAF (e.g. Cloudflare) — this delay alone is not sufficient.
const LOGIN_MIN_MS = 150

// Never matches any real password; ensures the credential-lookup code
// path is identical whether the username exists or not.
const SENTINEL_PASSWORD = "00000000-0000-0000-0000-000000000000"

interface Credential {
  password: string
  role: Role
  sub: string
}

async function getCredentials(): Promise<Record<string, Credential>> {
  const adminPassword = process.env.ADMIN_PASSWORD ?? "sumg2024"
  const defaultArtistPassword = process.env.ARTIST_PASSWORD ?? "artist-portal"

  const creds: Record<string, Credential> = {
    admin: { password: adminPassword, role: "admin", sub: "admin" },
  }

  // DB unavailability degrades artist logins but must never lock out admin.
  let artists: Awaited<ReturnType<typeof getArtists>> = []
  try {
    artists = await getArtists()
  } catch {
    // Supabase unreachable — continue with admin-only credential map.
  }

  for (const artist of artists) {
    const envKey = `ARTIST_PASSWORD_${artist.slug.toUpperCase().replace(/-/g, "_")}`
    creds[artist.slug] = {
      password: process.env[envKey] ?? defaultArtistPassword,
      role: "artist",
      sub: artist.slug,
    }
  }

  return creds
}

// Validates that returnTo is a same-origin relative path.
// Uses the URL constructor as the parser so all encoding/backslash
// edge cases are handled by the platform, not bespoke string checks.
function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || value.length > 200) return null
  try {
    const url = new URL(value, "https://x.local")
    if (url.origin !== "https://x.local") return null
    // Reconstruct from parsed parts — strips any smuggled fragments
    return url.pathname + url.search
  } catch {
    return null
  }
}

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

export async function login(_prev: unknown, formData: FormData) {
  // Start the floor timer immediately so all paths take at least LOGIN_MIN_MS
  const floor = new Promise<void>((r) => setTimeout(r, LOGIN_MIN_MS))

  const username = formData.get("username")?.toString().trim().toLowerCase() ?? ""
  const password = formData.get("password")?.toString() ?? ""
  const returnTo = safeReturnTo(formData.get("returnTo")?.toString())

  const creds = await getCredentials()
  const credential = creds[username]

  // Always compare a password string so this branch takes the same time
  // whether the username exists or not (prevents username enumeration).
  const expected = credential?.password ?? SENTINEL_PASSWORD
  const passwordMatch = expected === password
  const credentialValid = credential !== undefined && passwordMatch

  if (!credentialValid) {
    await floor
    return { error: "Invalid username or password." }
  }

  // Run token signing in parallel with the floor delay
  const [token] = await Promise.all([
    encodeSession(credential.role, credential.sub),
    floor,
  ])

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    ...COOKIE_BASE,
    maxAge: SESSION_TTL_SECONDS,
  })

  redirect(returnTo ?? (credential.role === "admin" ? "/admin" : "/dashboard"))
}

export async function logout() {
  const cookieStore = await cookies()
  // Mirror all original cookie attributes on the clearing Set-Cookie header
  // so every browser removes the cookie regardless of attribute handling.
  cookieStore.set(SESSION_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 })
  redirect("/login")
}
