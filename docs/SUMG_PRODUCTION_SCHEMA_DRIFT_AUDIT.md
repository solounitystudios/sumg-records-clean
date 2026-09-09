# SUMG Production Schema Drift Audit

**Status:** Read-only production verification. Live queries run against Supabase project `yisxnwbsnzxjnmzpstzj` ("sumg-studios-core") on 2026-09-09, via the Supabase MCP connection available in this Codespace (`list_tables`, `get_advisors`, `execute_sql` — all read-only SQL; no `apply_migration` call was made). Compared against repo state at `feat/catalog-command-center-foundation` @ `d7ac14a` (base `main` @ `2affc03`). No drift corrections were applied — this document is comparison only.

**Companion project note:** this same Supabase organization also hosts `personaworks-core` and `flow-platform`. Neither was queried in this pass, per the architecture's "do not couple PersonaWorks to SUMG internal tables" rule — every query below targeted `yisxnwbsnzxjnmzpstzj` only.

---

## 1. Headline finding: production is almost empty

Every one of the 53 `public` schema tables reports `rows=0` except `yt_channels` (2 rows) and `yt_engine_logs` (3,126 rows). `songs` and `releases` have zero rows. This changes the risk calculus for the rest of this pass considerably: there is currently no real catalog data, no real rights data, and no real customer data to protect or migrate. It does **not** change the RLS/security findings below, which are about policy correctness regardless of current row count.

## 2. Table existence — MATCH / DRIFT / PROD-ONLY / MISSING

53 tables exist in production. Cross-referenced against every `CREATE TABLE` in `lib/supabase/schema.sql` and `supabase/migrations/*.sql`.

### MATCH (repo migration exists, table exists in prod, shape matches on inspection)

`artists`, `producers`, `brands`, `releases`, `songs`, `assets`, `homepage_config`, `artist_timeline_items`, `artist_spotify_snapshots`, `import_logs`, `dna_records`, `producer_assets`, `yt_channels`, `yt_upload_jobs`, `producer_variations`, `dna_packs`, `yt_engine_logs`, `audio_inbox`, `finance_transactions`, `publishing_works`, `contracts`, `contract_templates`, `documents`, `message_threads`, `message_messages`, `admin_tasks`, `email_subscribers`, `apple_metrics_daily`, `thumbnail_profiles`, `thumbnail_presets`, `thumbnail_projects`, `thumbnail_versions`, `thumbnail_prompts`, `thumbnail_assets`, `thumbnail_generation_jobs`, `import_batches` — 36 tables, no material drift found.

**Minor correction to PR #21's `SUMG_CATALOG_REUSE_AUDIT.md`:** that doc listed `streams` as a `songs` column. It is not — `streams BIGINT` was added only to `releases` (`supabase/migrations/20260423000000_spotify_intelligence_layer.sql:26`), confirmed by both the repo migration and the live `songs` column list. Documentation error only, no functional impact; not corrected in that already-merged-pending doc, flagged here instead.

### DRIFT — CORRECTS A PRIOR PASS'S CONCLUSION

**`contributors` and `royalties` genuinely exist in production and are actively used.** PR #21's `SUMG_CATALOG_REUSE_AUDIT.md` (§6) and `SUMG_CATALOG_PERSISTENCE_AUDIT.md` called these "dead/broken code — table does not exist anywhere in `supabase/migrations/`." That conclusion was correct about the **repo** (no `CREATE TABLE contributors` or `CREATE TABLE royalties` exists in any committed migration) but wrong about **reality**: both tables exist live in production, with real column shapes matching what `lib/db/contributors.ts` and `lib/db/royalties.ts` expect (`contributors`: id, name, email, type, royalty_eligible, artist_slug, bio, created_at, updated_at; `royalties`: id, period, artist_slug, artist_name, streams, revenue, platforms, created_at). Someone created these directly against production (dashboard or an uncommitted migration) and the commit was never captured in `supabase/migrations/`. **This is the single most important correction in this document** — the prior pass's "dead code" conclusion was reached without a live query, exactly the failure mode this pass exists to prevent.

**`news` exists in production too**, actively used by `lib/db/news.ts`/`app/actions/news.ts`, same pattern — repo migration for it was never found in this audit either, but it works live.

### PROD-ONLY — an entire "Lyric Engine" subsystem with zero repo migration trace

`lyric_projects`, `lyric_drafts`, `lyric_contributions`, `lyric_persona_profiles`, `lyric_approvals` — five tables, fully live, with no `CREATE TABLE` anywhere in `supabase/migrations/` or `lib/supabase/schema.sql`. **Not dead:** `lib/db/lyrics.ts` and `app/actions/lyrics.ts` actively query all five (confirmed via `grep '.from("lyric_...")'`). This is a second, larger instance of the same pattern as `contributors`/`royalties`/`news` — a real, working subsystem whose schema history was never committed. `lyric_persona_profiles.contributor_id` and the `type: "human"|"ai_persona"` distinction on `contributors` (per PR #21's audit) are the closest existing precedent to "Persona identity" in the whole schema — worth remembering for a future PersonaWorks-adjacent design discussion, though this pass does not act on that.

**Recommendation (not executed this pass):** reverse-engineer `CREATE TABLE` statements for these 8 tables (`contributors`, `royalties`, `news`, and the 5 `lyric_*` tables) from `information_schema` and commit them as a single new migration file, so `supabase/migrations/` becomes a true record of what's deployed. This is the highest-value, lowest-risk follow-up from this entire audit — it's pure documentation-of-reality, zero schema change, and closes the exact gap that caused the "dead code" mis-diagnosis.

### PROD-ONLY — an unrelated merch/procurement system

`vendors`, `material_suppliers`, `products`, `product_costs`, `supplier_threads`, `supplier_messages`, `orders`, `finance_records`, `order_line_items` — 9 tables, zero references anywhere in this repo's code (`grep` for `.from("vendors")` etc. across all `.ts`/`.tsx` returns nothing). This is a separate application sharing the same Supabase project/organization — out of scope for the catalog work, not investigated further, not a catalog concern. Flagged only so a future reader doesn't mistake it for part of this system.

### MISSING IN PROD

None found. Every table with a repo migration exists in production.

### UNKNOWN

None — full read access was available for the entire `public` schema, so no table's existence is genuinely unknown.

## 3. RLS — enabled state

**All 53 tables have RLS enabled.** No table in production has RLS disabled. This is a better baseline than the repo-only audit could confirm (it could only see migration intent, not deployed reality).

## 4. RLS — policy drift (the actual finding that matters)

Per-table policy count from a live `pg_policies` join against `pg_tables`, restricted to the tables named in the mission brief plus everything RLS-enabled with zero policies:

| Table | Policies (prod) | Behavior | Repo expectation | Match? |
|---|---|---|---|---|
| `artists`/`producers`/`brands`/`homepage_config` | 2 each | public SELECT `true` + CMS-role ALL | same | ✅ MATCH |
| `releases`/`songs` | 2 each | public SELECT gated on `is_visible AND status='published'` + CMS-role ALL | same | ✅ MATCH |
| `assets` | 2 | public SELECT `true` + CMS-role ALL | same | ✅ MATCH — confirms PR #21's security audit correction was right |
| `audio_inbox` | 1 | CMS-role ALL only, no public policy | same | ✅ MATCH |
| `import_batches` | 1 | CMS-role ALL only | same | ✅ MATCH |
| `contracts`/`documents`/`publishing_works`/`finance_transactions`/`message_threads`/`message_messages`/`admin_tasks` | 2 each | **two overlapping ALL policies**, both effectively CMS-role-gated (one via `is_cms_role()`, one via an inline JWT-array check) | one policy expected | ⚠️ DRIFT — harmless (both equally restrictive) but real cruft: two separate migrations each added a redundant policy. Not a security issue, is a cleanup candidate. |
| `email_subscribers` | 2 | anon/authenticated INSERT (public signup form) + executive-only SELECT | same shape expected | ✅ MATCH |
| **`dna_records`** | 1 | **`FOR ALL USING(true) WITH CHECK(true)`** — fully open read+write to anyone | flagged as open in PR #21's security audit | ✅ CONFIRMED — the repo-only finding was correct |
| **`import_logs`** | 1 | **`FOR ALL USING(true) WITH CHECK(true)`** — fully open read **and write** | PR #21's audit said "open read only, no write policy (service-role only writes)" | ⚠️ DRIFT — production is *worse* than documented: write is open too, not just read |
| **`artist_spotify_snapshots`** | 2 | public SELECT `true` **+ write policy `auth.role() = 'authenticated'`** (any signed-in user, not CMS-role-gated) | PR #21's audit only flagged the public SELECT | ⚠️ NEW FINDING — the write policy gap was never documented before this pass |
| `apple_metrics_daily` | 2 | public SELECT `true` + CMS-role ALL for writes | matches PR #21's audit | ✅ MATCH (write side is fine; only SELECT is open, and its only caller uses service-role anyway — see §6 of the Master Vault doc / A0 validation below) |
| `contributors`, `royalties`, `news`, `finance_records`, `orders`, `products`, `vendors`, `lyric_projects`, `lyric_drafts`, `lyric_contributions`, `lyric_persona_profiles`, `lyric_approvals` | **0** | RLS enabled, zero policies — default deny for every non-service-role caller | not documented before (repo has no migration for 8 of these 12 tables at all) | See §5 |

## 5. The 12 zero-policy tables are not currently broken

The Supabase Advisor's `rls_enabled_no_policy` lint flags exactly these 12 tables. RLS-enabled-with-zero-policies means: **no row is visible or writable to any role except `service_role`** (which bypasses RLS entirely). Checked every one of the 8 tables that repo code actually queries (`contributors`, `royalties`, `news`, plus the 5 `lyric_*` tables): every calling module (`lib/db/contributors.ts`, `lib/db/royalties.ts`, `lib/db/news.ts`, `lib/db/lyrics.ts`) imports `supabase` from `lib/db/supabase.ts`, which is the **service-role** client. Service-role bypasses RLS, so these features work correctly in production today despite having zero policies. This is, functionally, the most locked-down state possible — not a bug. It would only become a problem if a future code path queried these tables using the anon/publishable key from client-side or public-facing code; none currently does.

## 6. New finding not in any prior pass: an anon-callable function bypasses `audio_inbox`'s RLS

`public.append_inbox_log(p_id text, p_entry jsonb)` (`supabase/migrations/20260504000000_audio_inbox_fixes.sql`) is `SECURITY DEFINER`, has no internal auth check, and — per the live Advisor scan — is `GRANT EXECUTE`'d to both `anon` and `authenticated`, reachable at `/rest/v1/rpc/append_inbox_log`. Its body is an unconditional `UPDATE audio_inbox SET action_log = ... WHERE id = p_id`. Anyone with the public anon key (which is, by design, exposed in the client bundle as `NEXT_PUBLIC_SUPABASE_ANON_KEY`) can call this RPC directly and mutate any `audio_inbox` row's `action_log`, completely bypassing `audio_inbox`'s otherwise-correct CMS-role-only RLS policy. The function also lacks a pinned `search_path` (a second, lower-severity Advisor finding — `function_search_path_mutable`, shared with `is_cms_role()`). App code (`app/actions/audioInbox.ts:173`) only ever calls this from a server action gated by admin auth, but the database-level exposure exists independent of how the app happens to call it today. See `SUMG_PROVIDER_CREDENTIAL_SECURITY_PLAN.md`... no — see the A0 validation section of `SUMG_NEXT_MIGRATION_DECISION.md` for the recommended remediation shape. **Not fixed in this pass** — read-only verification only.

## 7. Storage

Two buckets exist: `sumg-assets` (public, 26 objects, matches repo expectation exactly) and **`music`** (private, 1 object, created 2026-04-27, **zero references anywhere in this repo's code**). Full detail in `SUMG_MASTER_VAULT_PRODUCTION_READINESS.md`.

## 8. Provider token storage schema

`yt_channels.oauth_access_token`/`oauth_refresh_token` are `TEXT` columns as the repo migration defines — confirmed live, no drift. One row (`nightwire`) currently holds real token values (lengths only checked, never printed — see `SUMG_PROVIDER_CREDENTIAL_SECURITY_PLAN.md`). No `provider_connections`-style table exists in production, matching the repo's "genuine gap" conclusion.

## 9. Auth-related schema

No `public.users` or `public.profiles` table exists in production — role resolution is purely via the Supabase Auth JWT `app_metadata.role` claim, exactly as `lib/auth.ts` assumes. No drift.

## 10. Summary table

| Category | Count | Examples |
|---|---|---|
| MATCH | 36 tables | artists, songs, releases, assets, contracts, dna_records (structurally)... |
| DRIFT — corrects prior "dead code" claim | 3 tables | contributors, royalties, news |
| PROD-ONLY — undocumented live subsystem | 5 tables | lyric_projects, lyric_drafts, lyric_contributions, lyric_persona_profiles, lyric_approvals |
| PROD-ONLY — unrelated system, out of scope | 9 tables | vendors, products, orders, finance_records, ... |
| MISSING IN PROD | 0 | — |
| UNKNOWN | 0 | — |
| RLS policy DRIFT (more open than documented) | 2 tables | import_logs (write also open), artist_spotify_snapshots (write ungated) |
| RLS policy MATCH (open, previously flagged) | 1 table | dna_records |
| New security finding this pass | 1 function | append_inbox_log (anon-callable, RLS-bypassing) |
