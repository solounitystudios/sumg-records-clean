import { type NextRequest, NextResponse } from "next/server"
import { exchangeCode } from "@/lib/youtube/oauth"
import { supabase } from "@/lib/db/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code      = searchParams.get("code")
  const channelId = searchParams.get("state")
  const oauthErr  = searchParams.get("error")

  const engineUrl = new URL("/admin/youtube/engine", req.url)

  if (oauthErr) {
    engineUrl.searchParams.set("oauth_error", oauthErr)
    return NextResponse.redirect(engineUrl)
  }

  if (!code || !channelId) {
    engineUrl.searchParams.set("oauth_error", "missing_params")
    return NextResponse.redirect(engineUrl)
  }

  try {
    const tokens = await exchangeCode(code)
    const expiry  = new Date(Date.now() + tokens.expires_in * 1_000).toISOString()

    // Google only returns refresh_token on first authorization or when prompt=consent
    // is forced. Re-authorizing without forcing consent omits refresh_token — preserve
    // the existing stored token rather than overwriting it with null.
    const updatePayload: Record<string, unknown> = {
      oauth_access_token:  tokens.access_token,
      oauth_token_expiry:  expiry,
      oauth_scope:         tokens.scope,
      oauth_connected_at:  new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    }
    if (tokens.refresh_token) {
      updatePayload.oauth_refresh_token = tokens.refresh_token
    }

    const { error } = await supabase
      .from("yt_channels")
      .update(updatePayload)
      .eq("id", channelId)

    if (error) throw new Error(error.message)

    engineUrl.searchParams.set("oauth_success", "1")
    return NextResponse.redirect(engineUrl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "oauth_failed"
    engineUrl.searchParams.set("oauth_error", encodeURIComponent(msg))
    return NextResponse.redirect(engineUrl)
  }
}
