# SUMG Provider Credential Security Plan

**Status:** Read-only production verification, 2026-09-09. No token value was ever printed, logged, or copied out of the database. No token was rotated or revoked. No provider behavior was changed. Queries checked only boolean presence, string length, and timestamps.

---

## 1. Production reality of the `yt_channels.oauth_*` plaintext-storage finding

PR #21's security audit flagged, from repo inspection alone, that `yt_channels.oauth_access_token`/`oauth_refresh_token` are plain `TEXT` columns. Verified live:

| Channel | `oauth_access_token` present? | length | `oauth_refresh_token` present? | length | Token expiry | Connected at |
|---|---|---|---|---|---|---|
| `deadzone310` | No | — | No | — | — | — |
| `nightwire` | **Yes** | 254 chars | **Yes** | 103 chars | 2026-05-03 10:32 UTC | 2026-04-26 10:32 UTC |

**One real, live plaintext credential pair exists in production today.** The access token's recorded expiry (2026-05-03) is in the past relative to the current date (2026-09-09) — access tokens are short-lived by OAuth2 design and this app is expected to refresh them automatically via the refresh token, so an "expired" access-token timestamp is normal, not itself a finding. The refresh token's live/dead status was not (and cannot safely be) checked without calling Google's API, which this pass does not do (no provider behavior changes allowed).

## 2. What reads/writes these fields

- **Write:** `lib/youtube/oauth.ts` (initial OAuth exchange) and `app/api/youtube/oauth/callback/route.ts` (callback handler) — both server-only, both using the service-role client.
- **Read:** `lib/youtube/uploader.ts` (to authenticate the actual upload call) and `lib/db/commandPanel.ts::getProducerHealth()` (only checks `!!ch.oauth_refresh_token`, a boolean presence check — never reads the value into a UI-rendered string).
- **RLS:** `yt_channels` has exactly one policy, `admin_all_yt_channels`, gating ALL operations to CMS roles (`admin`/`editor`/`media_manager`/`release_manager`). **Not publicly exposed** — confirmed live, matches repo expectation. The risk here is "plaintext at rest, readable by anyone with CMS-role DB access or the service-role key," not "publicly readable."

## 3. Does encryption/credential-vault infrastructure already exist elsewhere?

No. Checked for: a `pgsodium`/`vault` extension in use (Supabase's built-in Vault feature), a `provider_connections`-style indirection table, any `credential_ref` pattern anywhere in the schema. None exist. `SUPABASE_SERVICE_ROLE_KEY` and every other provider secret (`SPOTIFY_CLIENT_SECRET`, `APPLE_MUSIC_PRIVATE_KEY`, etc.) live as plain environment variables — which is the correct, standard pattern for *application*-level secrets (never in a DB row, never in git). The `yt_channels` OAuth tokens are different in kind: they are *per-entity, per-connection* user-delegated credentials (one refresh token per YouTube channel a producer connects), which don't fit the "one secret per app, in an env var" model — that's exactly the gap `lib/catalog/types.ts::CatalogConnection` (shipped in PR #21, design-only) is meant to eventually fill, with a `credentialRef` field that points at a secret store instead of holding the value.

## 4. Least-disruptive remediation (planned, not executed)

Ordered by disruption, cheapest first:

1. **Do nothing urgent right now.** The table is not publicly exposed, is CMS-role-gated correctly, and only one row currently holds a real token. This is a real gap, not an active incident.
2. **Smallest safe fix: Supabase Vault.** **Verified installed, not assumed** — the security-migration-hardening pass (2026-09-09) checked directly: `select extname, extversion from pg_extension where extname='supabase_vault'` returns `supabase_vault, 0.3.1`; the `vault` schema exists; `vault.create_secret`, `vault.update_secret`, and the `vault.decrypted_secrets` view are all present and callable in this exact project. This is designed for exactly this case — encrypting a per-row secret at rest, decryptable only via a Postgres function callable with the right privileges. `yt_channels.oauth_access_token`/`oauth_refresh_token` would become `oauth_access_token_secret_id`/`oauth_refresh_token_secret_id UUID` columns referencing entries created via `vault.create_secret()`, with `lib/youtube/oauth.ts`/`uploader.ts` updated to write/read through Vault instead of the plain columns. Additive (new columns, migrate the one real row, drop the old plaintext columns in a separate later migration once confirmed working — three sequential steps, not one atomic change, per `SUMG_SECURITY_MIGRATION_HARDENING.md` §9), needs no new infrastructure to enable (already installed), and directly matches the `credentialRef`-indirection pattern already designed in `lib/catalog/types.ts::CatalogConnection`.
3. **Alternative if Vault proves awkward:** application-level encryption (encrypt with a key from `YOUTUBE_TOKEN_ENCRYPTION_KEY` env var before writing, decrypt on read) — more code to maintain, but zero new Postgres extensions to reason about. Fallback only if (2) turns out to have rough edges in practice.
4. **Not recommended:** moving these tokens into a third-party secret manager (e.g. a cloud KMS) — this app already runs entirely on Supabase + Vercel/Railway; adding a fourth infrastructure dependency for one table's two columns is disproportionate at this data volume (2 channel rows).

**This pass does none of the above.** It documents the finding and the recommended shape; implementing option 2 is explicit follow-up work requiring its own migration and a coordinated code change to `lib/youtube/oauth.ts`/`uploader.ts`, which touches a live, working integration and should not be bundled into an unrelated catalog-foundation pass.

## 5. Explicit confirmations

- Tokens printed: **NO**
- Tokens rotated: **NO**
- Tokens revoked: **NO**
- Provider (YouTube) behavior changed: **NO**
- Migration applied: **NO**
