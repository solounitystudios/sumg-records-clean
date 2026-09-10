/**
 * SUMG-SEC-P0-005 — schema/security contract for the OAuth-state migration.
 *
 * Structural checks on supabase/migrations/20260910000000_yt_oauth_state_integrity.sql.
 * Not a substitute for a live DB run, but locks the security-relevant shape and
 * keeps the migration inside P0-005 scope (additive only, no unrelated table).
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SQL = readFileSync(
  join(__dirname, "..", "..", "supabase", "migrations", "20260910013000_yt_oauth_state_integrity.sql"),
  "utf8",
)
/** DDL only — `-- ...` line comments stripped so "must not contain" tests real SQL. */
const CODE = SQL.replace(/--.*$/gm, "")

test("creates public.yt_oauth_states", () => {
  assert.match(CODE, /CREATE TABLE IF NOT EXISTS public\.yt_oauth_states/)
})

test("state_hash is UNIQUE and there is NO plaintext state column", () => {
  assert.match(CODE, /state_hash\s+TEXT\s+NOT NULL\s+UNIQUE/)
  assert.doesNotMatch(CODE, /\bstate_plain(text)?\b/i)
  assert.doesNotMatch(CODE, /\bstate_token\b/i)
  assert.doesNotMatch(CODE, /\bstate_raw\b/i)
  // no bare `state TEXT` column
  assert.doesNotMatch(CODE, /^\s*state\s+TEXT/mi)
})

test("channel FK → yt_channels and user binding FK → auth.users", () => {
  assert.match(CODE, /channel_id\s+UUID\s+NOT NULL\s+REFERENCES public\.yt_channels\(id\)\s+ON DELETE CASCADE/)
  assert.match(CODE, /initiated_by\s+UUID\s+NOT NULL\s+REFERENCES auth\.users\(id\)\s+ON DELETE CASCADE/)
})

test("timestamps are TIMESTAMPTZ and there is a finite-expiry constraint", () => {
  assert.match(CODE, /created_at\s+TIMESTAMPTZ/)
  assert.match(CODE, /expires_at\s+TIMESTAMPTZ\s+NOT NULL/)
  assert.match(CODE, /consumed_at\s+TIMESTAMPTZ\b/)
  assert.doesNotMatch(CODE, /\b(created_at|expires_at|consumed_at)\s+TIMESTAMP\b(?!TZ)/)
  assert.match(CODE, /CHECK\s*\(expires_at\s*>\s*created_at\)/)
})

test("RLS enabled with DELIBERATELY NO policies — no anon, no ordinary-authenticated mutation path", () => {
  assert.match(CODE, /ALTER TABLE public\.yt_oauth_states ENABLE ROW LEVEL SECURITY/)
  assert.doesNotMatch(CODE, /CREATE POLICY/i)
  assert.doesNotMatch(CODE, /TO anon/i)
  assert.doesNotMatch(CODE, /TO authenticated/i)
  assert.doesNotMatch(CODE, /USING \(true\)/)
})

test("consume function is SECURITY DEFINER, search_path-pinned, and a single atomic UPDATE", () => {
  assert.match(CODE, /CREATE OR REPLACE FUNCTION public\.consume_yt_oauth_state\(/)
  assert.match(CODE, /RETURNS UUID/)
  assert.match(CODE, /SECURITY DEFINER/)
  assert.match(CODE, /SET search_path = ''/)
  assert.match(CODE, /UPDATE public\.yt_oauth_states\s+SET consumed_at = pg_catalog\.now\(\)/)
  assert.match(CODE, /consumed_at IS NULL\s+AND expires_at\s*>\s*pg_catalog\.now\(\)/)
  assert.match(CODE, /RETURNING channel_id/)
  // no separate SELECT ... then UPDATE (race-prone) inside the function
  assert.doesNotMatch(CODE, /SELECT[\s\S]*FROM public\.yt_oauth_states[\s\S]*UPDATE public\.yt_oauth_states/)
})

test("consume function: empty search_path, fully schema-qualified references", () => {
  const fn = CODE.slice(
    CODE.indexOf("CREATE OR REPLACE FUNCTION public.consume_yt_oauth_state"),
    CODE.indexOf("$$;") + 3,
  )
  assert.match(fn, /SET search_path = ''/)
  assert.doesNotMatch(fn, /SET search_path = public\b/)
  // every now() call is pg_catalog-qualified
  for (const m of fn.match(/[A-Za-z_.]*now\(\)/g) ?? []) {
    assert.equal(m, "pg_catalog.now()", `unqualified now() in function body: ${m}`)
  }
  // every yt_oauth_states reference is public-qualified
  for (const m of fn.match(/[A-Za-z_.]*yt_oauth_states/g) ?? []) {
    assert.equal(m, "public.yt_oauth_states", `unqualified table ref in function body: ${m}`)
  }
})

test("EXECUTE on the consume function is service_role only", () => {
  assert.match(CODE, /REVOKE EXECUTE ON FUNCTION public\.consume_yt_oauth_state\(text, uuid\) FROM PUBLIC/)
  assert.match(CODE, /REVOKE EXECUTE ON FUNCTION public\.consume_yt_oauth_state\(text, uuid\) FROM anon/)
  assert.match(CODE, /REVOKE EXECUTE ON FUNCTION public\.consume_yt_oauth_state\(text, uuid\) FROM authenticated/)
  assert.match(CODE, /GRANT\s+EXECUTE ON FUNCTION public\.consume_yt_oauth_state\(text, uuid\) TO service_role/)
})

test("migration is additive / forward-only and touches no unrelated table", () => {
  assert.doesNotMatch(CODE, /DROP TABLE(?!\s+IF EXISTS public\.yt_oauth_states)/i)
  assert.doesNotMatch(CODE, /\bALTER TABLE\s+(?!public\.yt_oauth_states)/i)
  assert.doesNotMatch(CODE, /\bTRUNCATE\b/i)
  assert.doesNotMatch(CODE, /\bDELETE FROM\b/i)
  assert.doesNotMatch(CODE, /\bUPDATE\s+(?!public\.yt_oauth_states)/i)
  // explicitly must not reach into cron / catalog / master vault / RBAC objects
  for (const forbidden of ["yt_upload_jobs", "catalog_", "master_vault", "sumg-master-vault", "is_cms_role", "app_metadata"]) {
    assert.ok(!CODE.includes(forbidden), `migration must not reference ${forbidden}`)
  }
})

test("migration does not modify existing yt_channels OAuth credential columns", () => {
  assert.doesNotMatch(CODE, /oauth_access_token/)
  assert.doesNotMatch(CODE, /oauth_refresh_token/)
})
