import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decodeSession, SESSION_COOKIE } from "@/lib/session"

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await decodeSession(token) : null
  const { pathname } = request.nextUrl

  if (!session) {
    const url = new URL("/login", request.url)
    url.searchParams.set("returnTo", pathname)
    return NextResponse.redirect(url)
  }

  // /admin/* is restricted to the admin role only
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Explicit base-path entries alongside nested patterns so the matcher
  // is unambiguous regardless of path-to-regexp zero-segment behaviour.
  matcher: ["/admin", "/admin/:path+", "/dashboard", "/dashboard/:path+"],
}
