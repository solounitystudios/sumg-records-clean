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

    const { error } = await supabase
      .from("yt_channels")
      .update({
        oauth_access_token:  tokens.access_token,
        oauth_refresh_token: tokens.refresh_token ?? null,
        oauth_token_expiry:  expiry,
        oauth_scope:         tokens.scope,
        oauth_connected_at:  new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      })
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
