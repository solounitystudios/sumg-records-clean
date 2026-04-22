import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ── Route classification ─────────────────────────────────────────────────────

/** Sub-paths of /access that require authentication. */
const ACCESS_PROTECTED_PREFIXES = [
  "/access/dashboard",
  "/access/artist",
  "/access/staff",
  "/access/notifications",
  "/access/settings",
  "/access/support",
] as const;

/** CMS roles allowed on /admin/* and all /access/* protected routes. */
const CMS_ROLES = ["admin", "editor", "media_manager", "release_manager"] as const;

/** Roles allowed on /access/* protected routes (artist + all CMS roles). */
const ACCESS_ROLES = [...CMS_ROLES, "artist"] as const;

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function isAccessProtectedRoute(pathname: string): boolean {
  return ACCESS_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

function isStaffOnlyAccessRoute(pathname: string): boolean {
  return pathname.startsWith("/access/staff");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsGate = isAdminRoute(pathname) || isAccessProtectedRoute(pathname);
  if (!needsGate) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Supabase must be configured in all environments — the legacy sumg_session
  // cookie fallback has been removed.  If env vars are missing the server is
  // misconfigured; redirect to login so the error is visible.
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("https://")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Supabase SSR session check ────────────────────────────────────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() is the only safe way to verify the session in middleware
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (user.app_metadata?.role as string | undefined) ?? "";

  // ── /admin/* — CMS role gate ───────────────────────────────────────────────
  if (isAdminRoute(pathname)) {
    if (!CMS_ROLES.includes(role as (typeof CMS_ROLES)[number])) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "no_role");
      return NextResponse.redirect(loginUrl);
    }
    // Settings restricted to admin only
    if (pathname.startsWith("/admin/settings") && role !== "admin") {
      const adminUrl = new URL("/admin", request.url);
      adminUrl.searchParams.set("error", "settings_admin_only");
      return NextResponse.redirect(adminUrl);
    }
    return response;
  }

  // ── /access/* protected routes ────────────────────────────────────────────
  if (isAccessProtectedRoute(pathname)) {
    if (!ACCESS_ROLES.includes(role as (typeof ACCESS_ROLES)[number])) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "no_role");
      return NextResponse.redirect(loginUrl);
    }
    // Staff-only routes are not accessible to the artist role
    if (isStaffOnlyAccessRoute(pathname) && role === "artist") {
      const dashUrl = new URL("/access/dashboard", request.url);
      dashUrl.searchParams.set("error", "staff_only");
      return NextResponse.redirect(dashUrl);
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/access/dashboard", "/access/dashboard/:path*", "/access/artist/:path*", "/access/staff/:path*", "/access/notifications", "/access/notifications/:path*", "/access/settings", "/access/settings/:path*", "/access/support", "/access/support/:path*"],
};

