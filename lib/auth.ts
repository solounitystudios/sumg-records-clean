import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { decodeSession, SESSION_COOKIE } from "@/lib/session"
import type { SessionPayload } from "@/lib/session"

export type { SessionPayload } from "@/lib/session"

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return decodeSession(token)
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "admin") redirect("/dashboard")
  return session
}
