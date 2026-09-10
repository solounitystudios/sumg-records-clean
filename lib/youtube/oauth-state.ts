/**
 * SUMG-SEC-P0-005 — YouTube OAuth State Integrity
 *
 * Pure, dependency-free helpers for the OAuth `state` parameter. No database,
 * no `server-only`, no Next.js imports — so this module is unit-testable
 * directly under `node:test` (see `oauth-state.security.test.ts`).
 *
 * The threat these helpers close: before P0-005 the OAuth `state` was the
 * plaintext `yt_channels.id` (a predictable UUID). Anyone who reached the
 * callback with `?state=<any channel uuid>&code=<their own Google code>`
 * could bind their Google credentials to that channel — the callback did no
 * authentication, no user binding, no expiry, and no single-use check.
 *
 * After P0-005 the `state` is a 256-bit cryptographically random token. Only
 * its SHA-256 hash is persisted (`yt_oauth_states.state_hash`); the plaintext
 * exists only long enough to be placed into the Google authorization URL and
 * is never logged or stored.
 */

import { createHash, randomBytes } from "node:crypto"

/** 32 bytes = 256 bits of entropy from the CSPRNG. */
export const OAUTH_STATE_BYTES = 32

/**
 * base64url of 32 bytes is exactly 43 characters with no `=` padding.
 * Used as a cheap shape guard before hashing / touching the database.
 */
export const OAUTH_STATE_TOKEN_LENGTH = 43

/**
 * State lifetime. 10 minutes: long enough for a human to complete the Google
 * consent screen (including a fresh Google login and 2FA), short enough that a
 * leaked authorization URL is useless minutes later. No repository convention
 * dictates an OAuth-state TTL; 10 minutes matches the common OAuth guidance
 * (RFC 6749 §10.12 / OWASP) and the interactive nature of this flow.
 */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

/** A single random state token, URL-safe, 256 bits of entropy. */
export function generateOAuthStateToken(): string {
  return randomBytes(OAUTH_STATE_BYTES).toString("base64url")
}

/**
 * SHA-256 of the plaintext state token, hex-encoded. This is the ONLY form of
 * the token that is persisted. Given the hash, the plaintext cannot be
 * recovered; given the plaintext (returned from Google in the callback) the
 * hash is recomputed and matched.
 */
export function hashOAuthStateToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

/** True only for a string that looks like `generateOAuthStateToken()` output. */
export function isPlausibleOAuthStateToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token)
}

/** ISO timestamp `OAUTH_STATE_TTL_MS` in the future from `now` (default: real now). */
export function oauthStateExpiresAt(now: number = Date.now()): string {
  return new Date(now + OAUTH_STATE_TTL_MS).toISOString()
}
