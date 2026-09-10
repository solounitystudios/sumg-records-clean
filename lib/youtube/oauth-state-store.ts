/**
 * SUMG-SEC-P0-005 — YouTube OAuth State Integrity
 *
 * Server-only lifecycle for `public.yt_oauth_states`: mint a state row when an
 * authenticated admin starts a Connect-YouTube flow, and atomically consume it
 * exactly once in the OAuth callback.
 *
 * Only the SHA-256 hash of the state token ever reaches the database. The
 * plaintext token is returned to the caller solely to be placed into the
 * Google authorization URL — it is never logged or persisted here.
 *
 * Both operations use the service-role client (`lib/db/supabase.ts`). Direct
 * client access to `yt_oauth_states` is impossible: the table has RLS enabled
 * and NO policies, so anon and every authenticated (CMS) session is
 * default-denied. Consumption goes through the `consume_yt_oauth_state`
 * SECURITY DEFINER function, whose EXECUTE grant is `service_role` only.
 */

import "server-only"
import { supabase } from "@/lib/db/supabase"
import {
  generateOAuthStateToken,
  hashOAuthStateToken,
  oauthStateExpiresAt,
} from "./oauth-state"

/**
 * Create a single-use, user-bound, channel-bound, expiring OAuth state.
 * Returns the plaintext token to embed in the Google authorization URL.
 *
 * @throws a generic Error (no DB/PostgREST detail) if the row cannot be written.
 */
export async function createOAuthState(params: {
  channelId: string
  initiatedBy: string
}): Promise<string> {
  const token = generateOAuthStateToken()

  const { error } = await supabase.from("yt_oauth_states").insert({
    state_hash: hashOAuthStateToken(token),
    channel_id: params.channelId,
    initiated_by: params.initiatedBy,
    expires_at: oauthStateExpiresAt(),
  })

  if (error) {
    // Never surface the raw PostgREST/Postgres error to the caller/UI.
    throw new Error("Could not start the YouTube authorization flow. Please try again.")
  }

  return token
}

/**
 * Atomically consume the state matching (`state_hash`, `initiated_by`) that is
 * still unconsumed and unexpired. Returns the bound `channel_id` on success,
 * or `null` for every failure mode (unknown / expired / already-consumed /
 * wrong-user state, or a DB error).
 *
 * Atomicity: `consume_yt_oauth_state` is a single
 * `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING channel_id`.
 * Under READ COMMITTED two concurrent callbacks race for the same row's write
 * lock; the loser re-evaluates its WHERE against the now-consumed row, matches
 * zero rows, and returns null. Exactly one caller ever gets a channel_id back.
 */
export async function consumeOAuthState(params: {
  token: string
  userId: string
}): Promise<string | null> {
  const { data, error } = await supabase.rpc("consume_yt_oauth_state", {
    p_state_hash: hashOAuthStateToken(params.token),
    p_initiated_by: params.userId,
  })

  if (error || !data) return null
  return data as string
}
