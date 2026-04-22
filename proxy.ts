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

  // Admin routes are restricted to the admin role
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
}
