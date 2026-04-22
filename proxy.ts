import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate admin routes
  if (!pathname.startsWith("/admin")) {
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

  // ── CMS role gate ────────────────────────────────────────────────────────
  // Every authenticated user must carry a CMS role in app_metadata to access
  // any admin route. Users with no role (e.g. plain Supabase auth accounts)
  // are redirected to login with an explanatory query param.
  const CMS_ROLES = ["admin", "editor", "media_manager", "release_manager"] as const;
  const role = (user.app_metadata?.role as string | undefined) ?? "";

  if (!CMS_ROLES.includes(role as (typeof CMS_ROLES)[number])) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "no_role");
    return NextResponse.redirect(loginUrl);
  }

  // ── Settings restricted to admin only ────────────────────────────────────
  if (pathname.startsWith("/admin/settings") && role !== "admin") {
    const adminUrl = new URL("/admin", request.url);
    adminUrl.searchParams.set("error", "settings_admin_only");
    return NextResponse.redirect(adminUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};

