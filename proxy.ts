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

  // Role gate — any authenticated user without a valid CMS role is blocked.
  // app_metadata is set server-side only (service-role client) and cannot be
  // self-assigned, so only explicitly provisioned SUMG operators will pass.
  const VALID_CMS_ROLES = ["admin", "editor", "media_manager", "release_manager"];
  const role = user.app_metadata?.role as string | undefined;

  if (!role || !VALID_CMS_ROLES.includes(role)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "no_role");
    return NextResponse.redirect(loginUrl);
  }

  // /admin/settings is restricted to admin only
  if (pathname.startsWith("/admin/settings") && role !== "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};

