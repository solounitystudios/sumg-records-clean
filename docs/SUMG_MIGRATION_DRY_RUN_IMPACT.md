# SUMG Migration Dry-Run Impact Report

**UPDATE (staged security migration promotion pass, 2026-09-09): A0 and A0.1's simulated impact below was subsequently applied and verified for real.** A0's table below (ROWS TOUCHED = 0, etc.) turned out to be accurate in every respect. **A0.1's table below was NOT fully accurate** — it reasoned through the single `REVOKE EXECUTE ... FROM anon, authenticated` statement as sufficient, but live application revealed `PUBLIC` also held an `EXECUTE` grant (the PostgreSQL default for new functions) that the proposal never accounted for, requiring a second corrective migration (`REVOKE ... FROM PUBLIC`) to actually close the gap. See `SUMG_SECURITY_MIGRATION_HARDENING.md`'s status block for the full account. Lesson for future proposals: reasoning through a SQL statement's *intent* is not the same as tracing its full effective-privilege consequences — a live application (or an explicit ACL/`aclexplode` check beforehand) is what actually caught this, not the dry-run reasoning alone. A1/A2/A5's tables below remain simulation-only — not applied.

Also corrected: this doc's row-count claims for `dna_records`/`import_logs` should be read against the corrected finding in `SUMG_SECURITY_MIGRATION_HARDENING.md` — those tables held real rows (9 and 5 respectively), not zero as `list_tables`'s stale statistic suggested; ROWS TOUCHED = 0 for A0 remained true regardless (policy DDL never touches row data either way), but the "these tables are probably empty anyway" framing implied elsewhere was wrong.

**Original status:** Reasoned-through simulation, not an executed dry run — no migration was applied, no `EXPLAIN`/transaction-and-rollback test was run against production in this pass (Part 24 disallowed any mutation at the time this was written, and Postgres has no true no-op "dry apply" for DDL short of actually running it inside a transaction and rolling back). Every claim below is derived by reading the exact SQL in `supabase/migrations_proposed/{A0,A0_1,A1,A2,A5}*.sql` against the live schema state captured in `SUMG_SECURITY_MIGRATION_HARDENING.md` and `SUMG_PRODUCTION_SCHEMA_DRIFT_AUDIT.md`. Rollback statements referenced below live in each SQL file's own comments — not duplicated here beyond a pointer, per Part 23's instruction not to repeat the same facts across every doc.

---

## A0 — RLS hardening (4 statements, no new objects)

| | |
|---|---|
| OBJECTS CREATED | 0 |
| OBJECTS ALTERED | 0 (no `ALTER TABLE` — policy-only) |
| POLICIES DROPPED | 4: `admin_all_dna_records`, `admin_all_import_logs`, `cms write artist snapshots` (old qual), `public read apple metrics` |
| POLICIES CREATED | 5: `cms read dna_records`, `cms write dna_records`, `cms read import_logs`, `cms write artist snapshots` (new qual), `cms read apple metrics` |
| FUNCTIONS REPLACED | 0 |
| INDEXES CREATED | 0 |
| **ROWS TOUCHED** | **0** — policy DDL never touches row data |
| DATA BACKFILL | none |
| LOCK RISK | `DROP POLICY`/`CREATE POLICY` take a brief `ACCESS EXCLUSIVE` lock on the target table's own catalog entry — sub-millisecond in practice, and all four tables currently have 0–low rows and no concurrent write load |
| PUBLIC API IMPACT | `dna_records`/`import_logs`/`apple_metrics_daily` anon `SELECT` via PostgREST starts returning empty results instead of data (zero known caller, per the traced dependencies). `artist_spotify_snapshots` public SELECT is **unchanged** — not part of this migration |
| ADMIN IMPACT | None — every admin consumer of these 4 objects already uses the service-role client, which bypasses RLS regardless of policy content |
| WORKER IMPACT | None |
| ROLLBACK COMPLEXITY | Low — 4 independent DROP+CREATE pairs, each documented inline in the file |
| EXPECTED DOWNTIME | 0 |

## A0.1 — append_inbox_log hardening (1 function altered, no new objects)

| | |
|---|---|
| OBJECTS CREATED | 0 |
| OBJECTS ALTERED | 1 function (`search_path` pinned via `ALTER FUNCTION`) |
| GRANTS REVOKED | 2 (`EXECUTE` from `anon`, from `authenticated`) |
| FUNCTIONS REPLACED | 0 (body unchanged — only ACL + config changed) |
| **ROWS TOUCHED** | **0** |
| DATA BACKFILL | none |
| LOCK RISK | Negligible — `ALTER FUNCTION`/`REVOKE` lock only the function's own catalog row |
| PUBLIC API IMPACT | `POST /rest/v1/rpc/append_inbox_log` starts returning a permission-denied error for anon/authenticated callers. Zero legitimate caller — the one real call site already uses service-role, which keeps its grant |
| ADMIN IMPACT | None |
| WORKER IMPACT | None |
| ROLLBACK COMPLEXITY | Low — single `GRANT EXECUTE ... TO anon, authenticated` reverses it (documented as emergency-only, since it re-opens the bypass) |
| EXPECTED DOWNTIME | 0 |

## A1 — Work/Recording/Version/Lineage (4 new tables)

| | |
|---|---|
| OBJECTS CREATED | 4 tables: `catalog_works`, `catalog_recordings`, `catalog_asset_versions`, `catalog_asset_lineage` |
| OBJECTS ALTERED | 0 — fully additive, no `ALTER TABLE` on `songs`/`releases`/any existing table |
| POLICIES CREATED | 4 (`cms all` on each new table) |
| INDEXES CREATED | 7 explicit (`catalog_works_song_idx`, `catalog_recordings_work_idx`, `catalog_asset_versions_recording_idx`, `catalog_asset_versions_sha256_idx`, `catalog_asset_versions_upload_status_idx`, `catalog_asset_lineage_version_idx`, `catalog_asset_lineage_parent_idx`) + 4 implicit (one per `PRIMARY KEY`) |
| **ROWS TOUCHED** | **0** — brand-new empty tables |
| DATA BACKFILL | **None, by explicit design** — no existing `songs` row is touched or referenced automatically |
| LOCK RISK | `CREATE TABLE` takes no lock on any *existing* table. The two `REFERENCES` clauses pointing at already-live tables (`songs(id)`, `auth.users(id)`) require Postgres to briefly validate the FK against the referenced table when the constraint is added — a short `SHARE ROW EXCLUSIVE`-class lock on `songs` and on `auth.users`. At current row counts (`songs`: 0 rows; `auth.users`: a handful of admin accounts) this is negligible, but it is the one real lock consideration in this migration and should be run outside of any bulk `songs` write, out of caution |
| PUBLIC API IMPACT | PostgREST would newly expose `/rest/v1/catalog_works` etc., but with `is_cms_role()`-only policies and no public policy, anon callers get empty results / a permission error immediately — matches default-deny intent, no existing public endpoint is affected |
| ADMIN IMPACT | None until application code is written against these tables (none ships this pass) |
| WORKER IMPACT | None |
| ROLLBACK COMPLEXITY | Low — `DROP TABLE IF EXISTS` in reverse dependency order (documented in the file); since nothing writes to these tables yet, rollback destroys zero real data |
| EXPECTED DOWNTIME | 0 |

## A2 — Rights/Policy (2 new tables)

| | |
|---|---|
| OBJECTS CREATED | 2 tables: `catalog_rights_records`, `catalog_policy_flags` |
| OBJECTS ALTERED | 0 |
| POLICIES CREATED | 2 |
| CONSTRAINTS CREATED | 1 CHECK (`catalog_rights_records_ai_cannot_clear`), 2 UNIQUE (`(subject_type, subject_id)` on rights records — new this revision; `(subject_type, subject_id, flag)` on policy flags — unchanged) |
| INDEXES CREATED | 2 explicit + 2 PK implicit + 2 backing the UNIQUE constraints |
| **ROWS TOUCHED** | **0** |
| DATA BACKFILL | none |
| LOCK RISK | Same FK-to-`auth.users`/`documents`/`contracts` consideration as A1 — negligible at current scale |
| PUBLIC API IMPACT | None — same default-deny posture as A1 |
| ADMIN/WORKER IMPACT | None until used |
| ROLLBACK COMPLEXITY | Low — `DROP TABLE IF EXISTS catalog_policy_flags, catalog_rights_records`; zero real data destroyed |
| EXPECTED DOWNTIME | 0 |

## A5 — Audit Log (1 new table)

| | |
|---|---|
| OBJECTS CREATED | 1 table: `catalog_audit_log` |
| OBJECTS ALTERED | 0 |
| POLICIES CREATED | 2 (`cms read`, `cms insert` — deliberately no update/delete policy, making the log immutable through the normal client for every role including admin) |
| INDEXES CREATED | 2 explicit + 1 PK implicit |
| **ROWS TOUCHED** | **0** |
| DATA BACKFILL | none |
| LOCK RISK | Negligible, same FK-to-`auth.users` consideration |
| PUBLIC API IMPACT | None |
| ADMIN/WORKER IMPACT | None until used |
| ROLLBACK COMPLEXITY | Low — `DROP TABLE IF EXISTS catalog_audit_log`; zero real data destroyed |
| EXPECTED DOWNTIME | 0 |

## Rollback plan — pointer, not duplication

Every statement in every proposal file carries its own `ROLLBACK:` comment immediately above it (added this pass per Part 4's required comment structure). Three shapes, matching Part 17's guidance:

- **Policy changes (A0):** each rollback restores the *exact* previous live policy (name, command, qual) — copy-pasted from the live `pg_policies` query this pass ran, not reconstructed from memory.
- **New tables (A1/A2/A5):** `DROP TABLE IF EXISTS` in reverse dependency order, scoped only to the new objects — never touches `songs`/`releases`/`documents`/`contracts`/`auth.users`, the existing tables these new ones reference.
- **Function hardening (A0.1):** rollback is `GRANT EXECUTE ... TO anon, authenticated`, explicitly labeled in the file as emergency-only, since it restores the actual vulnerability — any real use of this rollback must be paired with immediately re-filing the regression.

No rollback in any file destroys data outside the migration's own new objects.

## Verification queries — to run immediately after a future approved apply (Part 16)

Documented now, for a later pass; **not executed against production in this pass.**

**After A0:**
```sql
-- Confirm the old open policies are gone and the new ones exist with the right qual.
select tablename, policyname, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename in ('dna_records','import_logs','artist_spotify_snapshots','apple_metrics_daily')
order by tablename, cmd;
-- Expect: dna_records has exactly 2 policies (SELECT + ALL, both is_cms_role());
-- import_logs has exactly 1 policy (SELECT, is_cms_role()), no write policy at all;
-- artist_spotify_snapshots still has its public-read SELECT policy (unchanged) plus
--   a write policy now reading is_cms_role() instead of auth.role()='authenticated';
-- apple_metrics_daily has exactly 2 policies, both is_cms_role().

-- Anon-access probe (safe — SELECT only, reads zero-sensitivity aggregate counts,
-- run with the anon key specifically, not service role):
select count(*) from dna_records;    -- expect: permission error or 0, never real rows
select count(*) from import_logs;    -- expect: permission error or 0
select count(*) from apple_metrics_daily; -- expect: permission error or 0
-- (artist_spotify_snapshots intentionally still returns rows via anon SELECT — that's correct, not a check failure)

-- Confirm the three admin dashboards that read artist_spotify_snapshots via the
-- anon client are unaffected (manual check, not SQL): load /admin/spotify and
-- /admin/analytics, confirm snapshot rows still render (they must, since A0
-- deliberately did not touch that SELECT policy).
```

**After A0.1:**
```sql
select has_function_privilege('anon', 'public.append_inbox_log(text,jsonb)', 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', 'public.append_inbox_log(text,jsonb)', 'EXECUTE') as auth_can_execute,
       has_function_privilege('service_role', 'public.append_inbox_log(text,jsonb)', 'EXECUTE') as service_role_can_execute;
-- Expect: anon_can_execute=false, auth_can_execute=false, service_role_can_execute=true

select proconfig from pg_proc where proname='append_inbox_log';
-- Expect: {search_path=public}

-- Functional check (manual, not SQL): exercise the real Audio Inbox action-log
-- flow from the admin UI once, confirm it still appends correctly (it must —
-- service_role's grant is untouched).
```

**After A1:**
```sql
select table_name from information_schema.tables
where table_schema='public' and table_name like 'catalog_%'
order by table_name;
-- Expect: catalog_works, catalog_recordings, catalog_asset_versions, catalog_asset_lineage

select column_name, data_type, is_nullable from information_schema.columns
where table_name='catalog_works' order by ordinal_position;
-- Confirm created_by is uuid (not text), status has the CHECK constraint

select count(*) from catalog_works, catalog_recordings, catalog_asset_versions, catalog_asset_lineage;
-- Expect: 0 rows in every table — confirms no unexpected backfill happened

select conname, confrelid::regclass from pg_constraint
where conrelid='catalog_works'::regclass and contype='f';
-- Expect: FKs to songs and auth.users, both valid (convalidated=true)
```

**After A2:**
```sql
select table_name from information_schema.tables where table_name in ('catalog_rights_records','catalog_policy_flags');

select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='catalog_rights_records'::regclass;
-- Confirm: the ai_cannot_clear CHECK now references set_by_source, the UNIQUE(subject_type, subject_id) exists

select column_name, column_default from information_schema.columns
where table_name='catalog_rights_records' and column_name='permissions';
-- Confirm the default is the explicit all-false jsonb object, not '{}'

select count(*) from catalog_rights_records, catalog_policy_flags;
-- Expect: 0
```

**After A5:**
```sql
select table_name from information_schema.tables where table_name = 'catalog_audit_log';
select policyname, cmd from pg_policies where tablename='catalog_audit_log';
-- Expect exactly 2 policies: SELECT and INSERT — confirm no UPDATE or DELETE policy exists at all (immutability check)
select count(*) from catalog_audit_log; -- expect 0
```
