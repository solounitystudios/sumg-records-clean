"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { encodeSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/session"
import type { Role } from "@/lib/session"
import { artists } from "@/lib/data"

interface Credential {
  password: string
  role: Role
  sub: string
}

function getCredentials(): Record<string, Credential> {
  const adminPassword = process.env.ADMIN_PASSWORD ?? "sumg2024"
  const defaultArtistPassword = process.env.ARTIST_PASSWORD ?? "artist-portal"

  const creds: Record<string, Credential> = {
    admin: { password: adminPassword, role: "admin", sub: "admin" },
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

function safeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//")) return null
  return value
}

export async function login(_prev: unknown, formData: FormData) {
  const username = formData.get("username")?.toString().trim().toLowerCase() ?? ""
  const password = formData.get("password")?.toString() ?? ""
  const returnTo = safeReturnTo(formData.get("returnTo")?.toString())

  const creds = getCredentials()
  const credential = creds[username]

  if (!credential || credential.password !== password) {
    return { error: "Invalid username or password." }
  }

  const token = await encodeSession(credential.role, credential.sub)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  })

  const destination =
    returnTo ?? (credential.role === "admin" ? "/admin" : "/dashboard")

  redirect(destination)
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
