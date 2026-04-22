import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_COOKIE = "sumg-session"
const SESSION_VALUE = "sumg_admin_authenticated_v1"

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)
  const authenticated = session?.value === SESSION_VALUE

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
}
