"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const SESSION_COOKIE = "sumg-session"
const SESSION_VALUE = "sumg_admin_authenticated_v1"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "sumg2024"

export async function login(_prev: unknown, formData: FormData) {
  const password = formData.get("password")?.toString() ?? ""

  if (password !== ADMIN_PASSWORD) {
    return { error: "Invalid password. Try again." }
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  redirect("/admin")
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
