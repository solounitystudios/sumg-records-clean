import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"
import { exchangeCode } from "@/lib/youtube/oauth"
import { isPlausibleOAuthStateToken } from "@/lib/youtube/oauth-state"
import { consumeOAuthState } from "@/lib/youtube/oauth-state-store"

/**
 * SUMG-SEC-P0-005 — YouTube OAuth callback.
 *
 * INVARIANT: no valid OAuth state  ⇒  no authorization-code exchange
 *                                 ⇒  no OAuth credential write.
 *
 * The `state` returned by Google is an opaque single-use token. The target
 * channel is resolved ONLY from the atomically-consumed `yt_oauth_states` row —
 * never from a query param or request body. The flow fails closed if there is
 * no session, if the session user is not the admin who initiated the flow, if
 * the state is unknown / expired / already consumed, or if the bound channel
 * no longer exists.
 *
 * User-facing errors are coarse reason codes only — no SQL/PostgREST detail,
 * no token/secret/state values.
 */

const ENGINE_PATH = "/admin/youtube/engine"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const engineUrl = new URL(ENGINE_PATH, req.url)

  const fail = (reason: string) => {
    engineUrl.searchParams.set("oauth_error", reason)
    return NextResponse.redirect(engineUrl)
  }

  // 1-2. Provider callback params + provider-side error.
  if (searchParams.get("error")) return fail("provider_denied")

  // 3. Require a well-formed state token.
  const state = searchParams.get("state")
  if (!isPlausibleOAuthStateToken(state)) return fail("invalid_state")

  // 4. Require an authorization code.
  const code = searchParams.get("code")
  if (!code) return fail("missing_code")

  // 5. Resolve the authenticated user — fail closed with no session.
  const user = await getAuthUser()
  if (!user) return fail("not_authenticated")

  // 6-8. Atomically consume the state bound to (hash, this user); get channel_id.
  //      Any mismatch (unknown/expired/consumed/wrong-user) yields null.
  let channelId: string | null
  try {
    channelId = await consumeOAuthState({ token: state, userId: user.id })
  } catch {
    return fail("state_error")
  }
  if (!channelId) return fail("invalid_state")

  try {
    // 9. Verify the bound channel still exists.
    const { data: channel, error: channelErr } = await supabase
      .from("yt_channels")
      .select("id")
      .eq("id", channelId)
      .single()
    if (channelErr || !channel) return fail("channel_missing")

    // 10. Exchange the authorization code (only now that state is validated).
    const tokens = await exchangeCode(code)

    // 11. Persist credentials for the bound channel only.
    //     Google omits refresh_token when it does not issue a new one — keep
    //     the existing stored refresh token rather than nulling it.
    const nowIso = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {
      oauth_access_token: tokens.access_token,
      oauth_token_expiry: new Date(Date.now() + tokens.expires_in * 1_000).toISOString(),
      oauth_scope:        tokens.scope,
      oauth_connected_at: nowIso,
      updated_at:         nowIso,
    }
    if (tokens.refresh_token) {
      updatePayload.oauth_refresh_token = tokens.refresh_token
    }

    const { error: updateErr } = await supabase
      .from("yt_channels")
      .update(updatePayload)
      .eq("id", channelId)
    if (updateErr) return fail("persist_failed")

    // 12. Existing success destination.
    engineUrl.searchParams.set("oauth_success", "1")
    return NextResponse.redirect(engineUrl)
  } catch {
    // Token-exchange failure or any unexpected error — no detail leaks out.
    return fail("oauth_failed")
  }
}
