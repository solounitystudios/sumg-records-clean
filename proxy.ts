import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (!isAdminRoute && !isDashboardRoute) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("https://")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Dashboard: any authenticated user may enter
  if (isDashboardRoute) {
    return response;
  }

  // Admin: require a CMS role in app_metadata
  const CMS_ROLES = ["admin", "editor", "media_manager", "release_manager"] as const;
  const role = (user.app_metadata?.role as string | undefined) ?? "";

  if (!CMS_ROLES.includes(role as (typeof CMS_ROLES)[number])) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "no_role");
    return NextResponse.redirect(loginUrl);
  }

  // Settings pages restricted to admin only
  if (pathname.startsWith("/admin/settings") && role !== "admin") {
    const adminUrl = new URL("/admin", request.url);
    adminUrl.searchParams.set("error", "settings_admin_only");
    return NextResponse.redirect(adminUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
