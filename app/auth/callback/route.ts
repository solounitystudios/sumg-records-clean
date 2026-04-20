import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * GET /auth/callback
 *
 * Handles Supabase Auth redirects:
 *  - Email confirmation (type=signup)
 *  - Magic-link login (type=magiclink)
 *  - Password recovery (type=recovery) → redirect to /reset-password
 *  - Generic PKCE code exchange → redirect to /admin or ?next param
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const type = searchParams.get("type"); // present for recovery links
  const next = searchParams.get("next") ?? "/admin";

  // No code — nothing to exchange; send to login with an error hint
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", origin)
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Expired or invalid token
    const url = new URL("/login", origin);
    url.searchParams.set(
      "error",
      error.message.toLowerCase().includes("expired")
        ? "link_expired"
        : "auth_error"
    );
    return NextResponse.redirect(url);
  }

  // For password-recovery flows redirect to the reset page
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", origin));
  }

  // All other flows (email confirmation, magic link, etc.)
  return NextResponse.redirect(new URL(next, origin));
}
