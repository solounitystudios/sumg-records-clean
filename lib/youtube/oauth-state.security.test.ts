/**
 * SUMG-SEC-P0-005 — YouTube OAuth State Integrity
 *
 * Two layers of proof:
 *   1. Direct unit tests of the pure helpers in `oauth-state.ts` (randomness,
 *      entropy, hashing, shape, TTL).
 *   2. Source-level invariants on the modules that cannot run outside a live
 *      Next.js request (`oauth-state-store.ts`, the callback route, the
 *      `initiateOAuth` action, `oauth.ts`) — same constraint/approach as the
 *      P0-004 `lib/youtube/thumbnails/actions.security.test.ts` suite.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  OAUTH_STATE_BYTES,
  OAUTH_STATE_TTL_MS,
  generateOAuthStateToken,
  hashOAuthStateToken,
  isPlausibleOAuthStateToken,
  oauthStateExpiresAt,
} from "./oauth-state"

const REPO_ROOT = process.cwd()
const read = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), "utf8")

const STORE_SRC = read("lib/youtube/oauth-state-store.ts")
const CALLBACK_SRC = read("app/api/youtube/oauth/callback/route.ts")
const OAUTH_SRC = read("lib/youtube/oauth.ts")
const YT_ENGINE_SRC = read("app/actions/ytEngine.ts")
const HELPER_SRC = read("lib/youtube/oauth-state.ts")
const MIGRATION_SRC = read("supabase/migrations/20260910013000_yt_oauth_state_integrity.sql")

// ── 1. Pure helper behavior ────────────────────────────────────────────────

test("state token is NOT a channel/database id — it is high-entropy random", () => {
  // A UUID is 36 chars with dashes; the state token is 43 base64url chars.
  const a = generateOAuthStateToken()
  const b = generateOAuthStateToken()
  assert.notEqual(a, b, "two tokens must differ")
  assert.doesNotMatch(a, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "token must not be a UUID")
  assert.match(a, /^[A-Za-z0-9_-]{43}$/, "token must be 43-char base64url")
})

test("state generation uses node:crypto CSPRNG, never Math.random / timestamps", () => {
  assert.match(HELPER_SRC, /from "node:crypto"/)
  assert.match(HELPER_SRC, /randomBytes\(/)
  assert.doesNotMatch(HELPER_SRC, /Math\.random/)
  // no Date-derived token material
  assert.doesNotMatch(HELPER_SRC, /Date\.now\(\)[^)]*\.toString\(/)
})

test("entropy is at least 256 bits", () => {
  assert.ok(OAUTH_STATE_BYTES >= 32, `expected >= 32 bytes, got ${OAUTH_STATE_BYTES}`)
  // decode the actual token and count bytes
  const raw = Buffer.from(generateOAuthStateToken(), "base64url")
  assert.ok(raw.length * 8 >= 256, `token carries ${raw.length * 8} bits`)
})

test("only SHA-256(token) is derived for storage; hash is deterministic and one-way-shaped", () => {
  const t = generateOAuthStateToken()
  assert.equal(hashOAuthStateToken(t), hashOAuthStateToken(t), "hash is deterministic")
  assert.match(hashOAuthStateToken(t), /^[0-9a-f]{64}$/, "hash is 64 hex chars (SHA-256)")
  assert.notEqual(hashOAuthStateToken(t), t, "hash must not equal the plaintext")
})

test("isPlausibleOAuthStateToken rejects junk, uuids, and wrong lengths", () => {
  assert.equal(isPlausibleOAuthStateToken(generateOAuthStateToken()), true)
  assert.equal(isPlausibleOAuthStateToken(null), false)
  assert.equal(isPlausibleOAuthStateToken(""), false)
  assert.equal(isPlausibleOAuthStateToken("00000000-0000-0000-0000-000000000000"), false)
  assert.equal(isPlausibleOAuthStateToken("a".repeat(42)), false)
  assert.equal(isPlausibleOAuthStateToken("a".repeat(44)), false)
  assert.equal(isPlausibleOAuthStateToken("!!!!" + "a".repeat(39)), false)
})

test("state has a finite, short TTL (10 minutes)", () => {
  assert.equal(OAUTH_STATE_TTL_MS, 10 * 60 * 1000)
  const base = 1_000_000_000_000
  const exp = new Date(oauthStateExpiresAt(base)).getTime()
  assert.equal(exp - base, OAUTH_STATE_TTL_MS)
})

// ── 2. Store module source invariants ──────────────────────────────────────

test("store persists only the hash — never the plaintext state token", () => {
  assert.match(STORE_SRC, /state_hash:\s*hashOAuthStateToken\(token\)/)
  // the plaintext `token` is only hashed + returned, never stored as a column value
  assert.doesNotMatch(STORE_SRC, /\b(state|state_plain|state_plaintext|state_token|state_raw|plaintext)\s*:\s*token\b/)
  assert.doesNotMatch(STORE_SRC, /p_state\s*:\s*params\.token\b/)
})

test("store binds state to channel_id and initiated_by", () => {
  assert.match(STORE_SRC, /channel_id:\s*params\.channelId/)
  assert.match(STORE_SRC, /initiated_by:\s*params\.initiatedBy/)
})

test("consumption goes through the atomic RPC, not a read-then-write", () => {
  assert.match(STORE_SRC, /\.rpc\(\s*"consume_yt_oauth_state"/)
  assert.match(STORE_SRC, /p_initiated_by:\s*params\.userId/)
  // no SELECT of the state row followed by a separate UPDATE in JS
  assert.doesNotMatch(STORE_SRC, /\.from\("yt_oauth_states"\)[\s\S]*\.select\(/)
})

test("store never logs and never leaks raw DB errors", () => {
  assert.doesNotMatch(STORE_SRC, /console\.(log|error|warn|info|debug)/)
  assert.doesNotMatch(STORE_SRC, /throw new Error\(\s*[`"'][^`"']*\$\{?\s*error/i)
  assert.match(STORE_SRC, /import "server-only"/)
})

test("the atomic UPDATE in the migration carries every guard clause", () => {
  const fn = MIGRATION_SRC.slice(MIGRATION_SRC.indexOf("CREATE OR REPLACE FUNCTION public.consume_yt_oauth_state"))
  assert.match(fn, /UPDATE public\.yt_oauth_states/)
  assert.match(fn, /SET consumed_at = pg_catalog\.now\(\)/)
  assert.match(fn, /state_hash\s*=\s*p_state_hash/)
  assert.match(fn, /initiated_by\s*=\s*p_initiated_by/)
  assert.match(fn, /consumed_at IS NULL/)
  assert.match(fn, /expires_at\s*>\s*pg_catalog\.now\(\)/)
  assert.match(fn, /RETURNING channel_id/)
  assert.match(fn, /SECURITY DEFINER/)
  assert.match(fn, /SET search_path = ''/)
})

// ── 3. Callback route source invariants ────────────────────────────────────

test("callback requires an authenticated user and validates state BEFORE code exchange", () => {
  const idxAuth = CALLBACK_SRC.search(/getAuthUser\(\)/)
  const idxConsume = CALLBACK_SRC.search(/consumeOAuthState\(/)
  const idxExchange = CALLBACK_SRC.search(/exchangeCode\(/)
  const idxPersist = CALLBACK_SRC.search(/\.from\("yt_channels"\)\s*\n?\s*\.update\(/)
  assert.ok(idxAuth !== -1 && idxConsume !== -1 && idxExchange !== -1 && idxPersist !== -1, "all four steps present")
  assert.ok(idxAuth < idxConsume, "auth resolved before state consumption")
  assert.ok(idxConsume < idxExchange, "state consumed before code exchange")
  assert.ok(idxConsume < idxPersist, "state consumed before credential write")
})

test("callback fails closed on missing session, missing state, missing code", () => {
  assert.match(CALLBACK_SRC, /if\s*\(\s*!user\s*\)\s*return fail\(/)
  assert.match(CALLBACK_SRC, /isPlausibleOAuthStateToken\(state\)\s*\)\s*return fail\(/)
  assert.match(CALLBACK_SRC, /if\s*\(\s*!code\s*\)\s*return fail\(/)
  assert.match(CALLBACK_SRC, /if\s*\(\s*!channelId\s*\)\s*return fail\(/)
})

test("callback resolves the channel ONLY from consumed state, never from a query param / body", () => {
  // channelId is assigned exclusively from consumeOAuthState(...)
  assert.match(CALLBACK_SRC, /channelId\s*=\s*await consumeOAuthState\(/)
  assert.doesNotMatch(CALLBACK_SRC, /searchParams\.get\(\s*["']channelId["']\s*\)/)
  assert.doesNotMatch(CALLBACK_SRC, /searchParams\.get\(\s*["']channel_id["']\s*\)/)
  assert.doesNotMatch(CALLBACK_SRC, /req\.json\(\)|await req\.formData\(\)/)
  // the old vulnerable pattern (state === channelId) is gone
  assert.doesNotMatch(CALLBACK_SRC, /const channelId\s*=\s*searchParams\.get\(\s*["']state["']\s*\)/)
})

test("callback verifies the bound channel still exists before persisting", () => {
  const idxCheck = CALLBACK_SRC.search(/\.from\("yt_channels"\)\s*\n?\s*\.select\("id"\)/)
  const idxPersist = CALLBACK_SRC.search(/\.update\(updatePayload\)/)
  assert.ok(idxCheck !== -1 && idxCheck < idxPersist, "channel existence checked before update")
})

test("callback never leaks secrets: no error-message passthrough, no logging of tokens/state", () => {
  assert.doesNotMatch(CALLBACK_SRC, /console\.(log|error|warn|info|debug)/)
  // no `err.message` / provider body forwarded into the redirect
  assert.doesNotMatch(CALLBACK_SRC, /oauth_error["']?\s*,\s*encodeURIComponent\(\s*(msg|err)/)
  assert.doesNotMatch(CALLBACK_SRC, /err instanceof Error \? err\.message/)
  assert.doesNotMatch(CALLBACK_SRC, /searchParams\.set\([^)]*\b(tokens?|access_token|refresh_token|state|state_hash)\b/)
})

test("callback preserves an existing refresh token when Google omits a new one", () => {
  assert.match(CALLBACK_SRC, /if\s*\(\s*tokens\.refresh_token\s*\)\s*\{[\s\S]*?oauth_refresh_token/)
  // never unconditionally writes a null/empty refresh token
  assert.doesNotMatch(CALLBACK_SRC, /oauth_refresh_token:\s*(null|undefined|""|tokens\.refresh_token\s*\?\?)/)
})

// ── 4. initiateOAuth action + buildAuthUrl invariants ──────────────────────

test("initiateOAuth authorizes, binds state to the admin, and mints state before redirect", () => {
  const slice = YT_ENGINE_SRC.slice(YT_ENGINE_SRC.indexOf("export async function initiateOAuth"))
  const body = slice.slice(0, slice.indexOf("\n}\n") + 2)
  const idxAdmin = body.search(/requireAdmin\(\)/)
  const idxCreate = body.search(/createOAuthState\(/)
  const idxRedirect = body.search(/redirect\(buildAuthUrl\(/)
  assert.ok(idxAdmin !== -1 && idxAdmin < idxCreate, "requireAdmin() before createOAuthState()")
  assert.ok(idxCreate !== -1 && idxCreate < idxRedirect, "state minted before redirect")
  assert.match(body, /createOAuthState\(\{\s*channelId,\s*initiatedBy:\s*user\.id\s*\}\)/)
  // state passed to buildAuthUrl is the minted token, not the channel id
  assert.doesNotMatch(body, /buildAuthUrl\(channelId\)/)
})

test("buildAuthUrl takes an opaque state, and oauth.ts no longer equates state with a channel id", () => {
  assert.match(OAUTH_SRC, /export function buildAuthUrl\(state:\s*string\)/)
  assert.match(OAUTH_SRC, /state,\s*\n\s*\}\)/)
  assert.doesNotMatch(OAUTH_SRC, /state:\s*channelDbId/)
})
