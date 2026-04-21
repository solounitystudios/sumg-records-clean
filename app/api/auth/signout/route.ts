import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/signout
 * Signs the current user out of Supabase Auth
 * and redirects the browser to /login as a GET request.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    request.nextUrl.origin;

  const loginUrl = new URL("/login", origin);

  return NextResponse.redirect(loginUrl, { status: 303 });
}