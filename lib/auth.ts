import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const SESSION_COOKIE = "sumg-session"
const SESSION_VALUE = "sumg_admin_authenticated_v1"

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  return session?.value === SESSION_VALUE
}

export async function requireAuth() {
  const authenticated = await getSession()
  if (!authenticated) {
    redirect("/login")
  }
}
