import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

const ADMIN_ROLES = ["owner", "co_owner", "admin", "editor", "media_manager", "release_manager"] as const
const SETTINGS_ROLES = ["owner", "co_owner", "admin"] as const

// Known valid path segments directly under /admin/youtube/
const VALID_YT_SEGMENTS = new Set([
  "inbox", "command", "monetization", "optimizer", "schedule",
  "engine", "render", "queue", "channels", "jobs", "thumbnail-studio",
])

function isPromptAsPath(pathname: string): boolean {
  if (!pathname.startsWith("/admin/youtube/")) return false
  const segment = pathname.slice("/admin/youtube/".length).split("/")[0]
  if (VALID_YT_SEGMENTS.has(segment)) return false
  // Prompt text: long (>30 chars), has spaces/commas/hyphens from Midjourney flags
  return (
    segment.length > 30 ||
    segment.includes("--") ||
    segment.includes(",") ||
    segment.includes("%20") || // URL-encoded space
    segment.includes("%2C")    // URL-encoded comma
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/dashboard")
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("https://")) {
    if (isProtected) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Always refresh session — must be called before any auth checks.
  // Do not add logic between createServerClient and auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isProtected) return response

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith("/dashboard")) return response

  // /admin routes — check role
  const role = (user.app_metadata?.role as string | undefined) ?? ""

  if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (
    pathname.startsWith("/admin/settings") &&
    !SETTINGS_ROLES.includes(role as (typeof SETTINGS_ROLES)[number])
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Guard: prompt text accidentally used as a route (e.g. copy-paste into browser bar)
  // Redirect to Thumbnail Studio instead of serving a 404.
  if (isPromptAsPath(pathname)) {
    return NextResponse.redirect(new URL("/admin/youtube/thumbnail-studio", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
