# SUMG Security Migration Hardening

**Status:** Read-only production re-verification + migration-proposal revision, 2026-09-09, against `yisxnwbsnzxjnmzpstzj`. No migration applied, no RLS changed live, no bucket created, no row mutated, no credential rotated. This document is the trace and reasoning behind the revised `supabase/migrations_proposed/A0*`, `A1`, `A2`, and `A5` files — read those files' own inline comments for the authoritative per-statement detail; this doc is the narrative and the cross-cutting analysis that doesn't fit in a SQL comment. Companion docs: `SUMG_MIGRATION_DRY_RUN_IMPACT.md` (what each migration would actually do), `SUMG_MASTER_VAULT_IMPLEMENTATION_PREFLIGHT.md` (vault + SHA-256 + transaction design).

---

## 1. Live security state, re-verified

Fresh `pg_policies` + `pg_proc`/`has_function_privilege()` queries against `dna_records`, `import_logs`, `artist_spotify_snapshots`, `apple_metrics_daily`, `audio_inbox`, and `append_inbox_log` on 2026-09-09 returned results **identical** to the production-verification pass — no drift since `3ef6c1f`. Full precise per-command anon/authenticated breakdown:

| Table | RLS | Policy | Cmd | Roles | USING | WITH CHECK | anon SELECT | anon INSERT/UPDATE/DELETE | any authenticated (non-CMS) |
|---|---|---|---|---|---|---|---|---|---|
| `dna_records` | ✅ | `admin_all_dna_records` | ALL | `{public}` | `true` | `true` | ✅ | ✅ | ✅ |
| `import_logs` | ✅ | `admin_all_import_logs` | ALL | `{public}` | `true` | `true` | ✅ | ✅ | ✅ |
| `artist_spotify_snapshots` | ✅ | `public read artist snapshots` | SELECT | `{public}` | `true` | — | ✅ | — | — |
| `artist_spotify_snapshots` | ✅ | `cms write artist snapshots` | ALL | `{public}` | `auth.role()='authenticated'` | same | ❌ | ❌ | ✅ (any signed-in user, not just CMS) |
| `apple_metrics_daily` | ✅ | `public read apple metrics` | SELECT | `{public}` | `true` | — | ✅ | — | — |
| `apple_metrics_daily` | ✅ | `cms write apple metrics` | ALL | `{public}` | `is_cms_role()` | same | ❌ | ❌ | only if CMS role |
| `audio_inbox` | ✅ | `admin_all_audio_inbox` | ALL | `{public}` | `is_cms_role()` | same | ❌ | ❌ | only if CMS role |

`append_inbox_log(p_id text, p_entry jsonb)`: `SECURITY DEFINER`, owner `postgres`, `proconfig` null (no `search_path` pinned), body is an unconditional `UPDATE audio_inbox SET action_log = ... WHERE id = p_id` with no internal check. `has_function_privilege()` confirmed, per role: `anon` → **true**, `authenticated` → **true**, `service_role` → true, `postgres` → true. This bypasses `audio_inbox`'s otherwise-correct table policy completely for any caller with the public anon key.

## 2. App dependency traces — proof, not directory-name assumption

Every consumer of the six targets was found by grepping for `.from("<table>")` / `.rpc("append_inbox_log"...)`, then the actual client-constructing import line was read in each file (never assumed from the file's path):

| Table/function | Files | Client actually used | Server/client | Public-site dependency? |
|---|---|---|---|---|
| `dna_records` | `lib/db/dna.ts`, `app/actions/dna.ts` | `lib/db/supabase.ts` — **service-role** | server, `requireAdmin()`-gated | None found |
| `import_logs` | `app/admin/{command-center,logs,activity}/page.tsx`, `app/actions/imports.ts` | `lib/db/supabase.ts` — **service-role** | server, `requireAdmin()`-gated | None found |
| `apple_metrics_daily` | `lib/db/appleMusic.ts` (sole consumer) | `lib/db/supabase.ts` — **service-role** | server, callers (`app/api/apple-music/link-*`) gated by `getAuthUser()` + `isExecutiveRole()` | None found |
| `audio_inbox` | 9 files (`lib/db/audioInbox.ts`, `lib/db/optimizer.ts`, `lib/youtube/processor.ts`, `lib/youtube/thumbnails/actions.ts`, 3 admin pages, `app/actions/{audioInbox,assets}.ts`) | `lib/db/supabase.ts` — **service-role**, every single file | server only | None found |
| `append_inbox_log` | `app/actions/audioInbox.ts:173` (sole caller) | called via the service-role `supabase.rpc(...)` — but the **function itself** is separately EXECUTE-granted to `anon` at the DB level regardless of how this one app caller happens to invoke it | server, but the DB-level exposure is independent of the app | None found (but the DB-level bypass doesn't care that the app never calls it as anon) |
| `artist_spotify_snapshots` — **read** | `lib/cms/index.ts::getArtistSpotifySnapshots()` | `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)` built fresh with **no session** — this is the **anon key**, confirmed by reading `getSupabaseClient()`'s own source, not inferred | server components, but **not** admin-auth-aware at the DB layer (see §5) | callers are `/admin/spotify`, `/admin/analytics`, `SpotifyArtistRow.tsx` — all under `/admin`, **zero public routes** |
| `artist_spotify_snapshots` — **write** | `app/actions/spotify.ts::refreshArtistSpotifySnapshot()` | `lib/db/supabase.ts` — **service-role** | server, action-gated | None found |

**No file under `lib/db/` was assumed to be service-role by convention — every single one was opened and its import line read.** `lib/cms/index.ts` is the one and only anon-key consumer among all six targets, and it is not what most of the previous passes' language ("public site reads...") implied — see §5.

## 3. A0, rewritten — summary (full detail in the file itself)

`supabase/migrations_proposed/A0_rls_hardening.sql` now targets exactly four statements, each with a `CURRENT LIVE STATE` / `WHY CHANGE` / `EXPECTED AFTER STATE` / `ROLLBACK` / `DEPENDENCY / BLAST RADIUS` comment block, using only policy names confirmed live moments before writing the file:

1. `dna_records` — close both read and write to CMS roles only. Zero traced dependency on the open policy.
2. `import_logs` — SELECT-only for CMS roles, no write policy at all (matches how the app already writes it — service-role only).
3. `artist_spotify_snapshots` — **write policy only**, tightened from "any authenticated user" to `is_cms_role()`. The read (public SELECT) policy is deliberately **not** touched — see §5 for why.
4. `apple_metrics_daily` — SELECT restricted to CMS roles. Fully safe; zero dependency traced.

`append_inbox_log` is deliberately **not** in A0 — different remediation shape, see §4/A0.1.

## 4. A0.1 — summary (full detail in the file itself)

`supabase/migrations_proposed/A0_1_append_inbox_log_hardening.sql`: `REVOKE EXECUTE ... FROM anon, authenticated` plus pinning `search_path = public` (closes the companion `function_search_path_mutable` Advisor finding on the same function for free). Chosen over three other options (internal auth check, dropping `SECURITY DEFINER`, moving the update fully server-side) because the one legitimate caller (`app/actions/audioInbox.ts:173`) already calls this function via the service-role client, which keeps its EXECUTE grant unchanged — **zero app-code change required**, zero risk to the legitimate Audio Inbox workflow.

## 5. Public Spotify read dependency — corrected framing

The task brief (and the prior pass) characterized this as "the public site reads `artist_spotify_snapshots` through an anon-key client." Tracing every caller precisely (§2) shows that's not quite what's happening: **zero public routes reference this table at all** — not `app/artists/[slug]/page.tsx`, not the homepage, not any shared component. The public artist page doesn't even render follower/popularity numbers today. The only reader is three **admin** surfaces, and they use the anon key not because public exposure is required, but because `lib/cms/index.ts::getArtistSpotifySnapshots()` was written as a generic "public CMS read" helper and happened to get reused from an admin page without anyone routing it through an authenticated client.

This matters because it changes the fix: there is no real public requirement to design a "safe view/projection" around (Part 6's suggestion) — the actual fix is to stop three admin pages from using an anonymous client for admin data, which is a **code change**, not a schema/policy design problem. Concretely: `lib/cms/index.ts::getArtistSpotifySnapshots()` and `insertArtistSpotifySnapshot()` should be pointed at the service-role client (matching every other admin data-fetch in this codebase), after which the SELECT policy can be safely restricted to `is_cms_role()` with zero functional loss, in a follow-up migration. That code change is out of scope for this SQL-only pass (Part 24 disallows it), so A0 ships the safe half now (the write-policy fix) and documents the precondition for the other half explicitly, rather than either breaking the admin dashboards or leaving the whole table untouched.

**If a future pass decides the follower/popularity numbers should become genuinely public** (e.g. shown on the artist page), the "safe view/projection" Part 6 asks about would be the right shape then — a view exposing only `artist_slug`, `followers`, `popularity`, `snapshot_at` (never `spotify_id`, never internal timestamps beyond what's needed) — but that's a product decision with no current driver; not designed further here.

## 6. Apple Music policy impact

`lib/db/appleMusic.ts` is the only consumer of `apple_metrics_daily`, using the service-role client for both read and write. Its only callers, `app/api/apple-music/link-{artist,release,song}/route.ts`, are gated by `getAuthUser()` + `isExecutiveRole()` before the DB is ever touched. No worker touches it. No public route touches it. **A0's restriction is fully compatible with actual callers — this is the cleanest of the four A0 fixes.**

## 7. `dna_records` — application usage

Contains producer/artist creative-identity profiles (archetype, brand positioning, Suno metatag rules, YouTube packaging DNA) — internal editorial IP, per the original reuse audit. `lib/db/dna.ts` (read) and `app/actions/dna.ts` (write, `requireAdmin()`-gated) are the only consumers, both service-role. **No public use case exists anywhere in the codebase.** Target policy (default deny for direct public access) is fully achievable with zero code change.

## 8. `import_logs` — application usage

Written exclusively by `app/actions/imports.ts` (3 `requireAdmin()`-gated call sites), read exclusively by three admin dashboard pages — all service-role. **Direct anon/authenticated access is not required anywhere.** Minimum policy: CMS-role SELECT only, matching what A0 now proposes.

## 9. YouTube token remediation — refined with actual verification

Part 10 explicitly required not assuming Supabase Vault is available. Checked directly:

```sql
select extname, extversion from pg_extension where extname = 'supabase_vault';
-- → supabase_vault, 0.3.1  (installed)
select schema_name from information_schema.schemata where schema_name = 'vault';
-- → vault  (schema exists)
select proname from pg_proc where pronamespace = 'vault'::regnamespace;
-- → create_secret, update_secret, plus internal crypto helpers
select table_name from information_schema.views where table_schema = 'vault';
-- → decrypted_secrets
```

**Confirmed, not assumed: Supabase Vault is genuinely installed and fully functional in this project** (`vault.create_secret`, `vault.update_secret`, `vault.decrypted_secrets` all present). This validates (rather than merely proposes) the remediation direction from the previous pass.

```
PREFERRED TOKEN STORAGE: Supabase Vault (vault.create_secret / vault.decrypted_secrets)
WHY: Already installed and functional in this exact project — zero new infrastructure,
     zero new extension to enable, purpose-built for per-row encrypted secrets, and
     matches the credentialRef-indirection pattern already designed in
     lib/catalog/types.ts::CatalogConnection.
MIGRATION METHOD: Additive — add yt_channels.oauth_access_token_secret_id /
     oauth_refresh_token_secret_id (uuid, nullable), write the one real token pair
     (nightwire) into vault.create_secret(), populate the new columns, update
     lib/youtube/oauth.ts / lib/youtube/uploader.ts to read via
     vault.decrypted_secrets instead of the raw column, verify uploads still work,
     THEN drop the old plaintext columns in a separate, later migration once confirmed.
     Not a single atomic step — three sequential, independently reversible migrations.
ROLLBACK: at each step, the old plaintext columns remain untouched until the final
     drop step — rollback before that step is simply "stop, the plaintext columns
     still work." After the drop step, rollback requires re-deriving from
     vault.decrypted_secrets, which stays possible indefinitely (Vault doesn't
     delete on schema rollback).
TOKEN ROTATION REQUIRED AFTER MIGRATION? NO — the same token values move into Vault,
     they are not invalidated by being moved.
DOWNTIME: none required — additive columns, then a code deploy, then a cleanup
     migration; the YouTube upload pipeline is not synchronous with any user-facing
     request path (it's a cron-triggered background job per vercel.json), so even a
     brief mismatch window during cutover has no user-facing effect.
APP CODE CHANGES REQUIRED: YES — lib/youtube/oauth.ts (write path) and
     lib/youtube/uploader.ts (read path) both need updating to call Vault functions
     instead of reading/writing the plain columns directly. Not done this pass —
     Part 24 disallows OAuth token changes and this is exactly that.
```

## 10. A1 review — challenged fields, summary (full detail in the file itself)

`supabase/migrations_proposed/A1_work_recording_version_lineage.sql` revised: `created_by`/`uploaded_by` → `UUID REFERENCES auth.users(id)` (confirmed live: `auth.users.id` is `uuid`, exists, and is referenced by **zero** tables anywhere in this schema today — every existing "who did this" column in the whole 53-table schema is loose `TEXT`; not repeating that weak pattern here per the explicit instruction not to). `artist_reference` renamed `artist_slug` (still loose `TEXT`, matching the schema-wide `artist_slug` convention used by `finance_transactions`/`contracts`/`documents` — deliberately kept loose, unlike the identity fields, because "which artist" can be genuinely unknown at intake). `song_id` stays `TEXT` because `songs.id` is `TEXT` in production (confirmed live) — not a drift, a correct bridge. `is_primary` kept — directly answers "can a Recording later have multiple Versions without schema regret" (yes, and this is the free marker for which is current). `sha256` stays indexed, not unique — a hard constraint would block the intake plan's own "upload anyway as a deliberate new version" admin choice for exact duplicates.

## 11. A2 review — challenged against locked semantics, summary (full detail in the file itself)

`supabase/migrations_proposed/A2_rights_policy.sql` revised: `set_by` → `UUID REFERENCES auth.users(id)`, same identity upgrade. New `set_by_source` column mirrors `lib/catalog/types.ts`'s `ProvenanceSource` enum exactly, and the AI-cannot-clear backstop CHECK now keys off `set_by_source IN ('ai_inferred','telemetry_learned')` instead of a fragile `set_by = 'ai'` string match — the DB-level defense-in-depth check and the app-level primary check (`lib/catalog/rights.ts::assertAiCannotClear`) now share one vocabulary instead of two independently-driftable ones. `permissions` default changed from `'{}'` to an explicit all-`false` object — functionally identical through the domain layer, but removes ambiguity for any future non-TypeScript reader. Added `UNIQUE (subject_type, subject_id)`: `catalog_rights_records` is confirmed-by-design a **mutable current-state** table (one row per subject), not a history table — rights-state-change *history* is A5's job (`RIGHTS_STATE_CHANGED` events with before/after state), so building a second history mechanism inside A2 itself would be exactly the overbuilt schema Part 12 warns against.

## 12. A5 review — reuse check, summary (full detail in the file itself)

Checked whether existing SUMG activity/audit infrastructure could be reused instead of a new table: `audio_inbox.action_log` (jsonb array on a single row) is YouTube-pipeline-specific and can't represent a cross-entity event stream; `import_logs`/`import_batches` are import-specific (and `import_logs` has its own open-RLS problem, being fixed separately in A0); neither is a general append-only audit log. **No duplicate audit universe is being created — A5 fills a confirmed, real gap.** `actor` revised from `TEXT` to `UUID REFERENCES auth.users(id)`, nullable (unlike A1's `uploaded_by`) because a genuinely automation-triggered future event (with no human actor, `automation_rule_id` populated instead) is a real, intended case for this table, not a hypothetical.

## 13. Migration dependency graph — proven from SQL, not assumed

Grepped every `REFERENCES` clause in all seven proposal files (A0, A0.1, A1, A2, A3, A4, A5). Result: **none references a table defined in a different proposal file.** Every `REFERENCES` clause points either at an already-live production table (`songs`, `documents`, `contracts`, `auth.users`) or at a table defined earlier in the *same* file. A2's `subject_type`/`subject_id` is confirmed a loose polymorphic reference, not an FK to A1's `catalog_works` — so even A1 → A2 is not a hard DB dependency, contrary to what might be assumed from the numbering. **All seven files are independently applicable, in any order, at the database level.** A recommended (not required) application order exists for workflow reasons — see `supabase/migrations_proposed/README.md`, updated this pass with the full proof and the revised order (`A0 → A0.1 → A1 → A2 → A5 → A3/A4 later`).
