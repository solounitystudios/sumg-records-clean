-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A0 — RLS hardening, REWRITTEN 2026-09-09 against a live pg_policies query
-- against yisxnwbsnzxjnmzpstzj (see docs/SUMG_SECURITY_MIGRATION_HARDENING.md
-- for the full trace). The version reviewed in PR #21 used guessed policy
-- names that did not match production for 3 of its 4 targets — this version
-- uses only names confirmed live moments before writing this file. Every
-- statement below is scoped to changes with a fully traced, zero-legitimate-
-- dependency blast radius (see per-statement DEPENDENCY / BLAST RADIUS
-- comments) — nothing here requires a coordinated app-code change to deploy
-- safely, which is why the artist_spotify_snapshots SELECT policy is
-- deliberately NOT touched in this file (see §3 below).
--
-- Independent of A1/A2/A5. append_inbox_log is deliberately NOT covered here
-- — see A0_1_append_inbox_log_hardening.sql (different remediation shape:
-- function GRANT/REVOKE, not CREATE POLICY).

-- ============================================================================
-- 1. dna_records — fully open (read AND write) to anon and authenticated
-- ============================================================================
-- CURRENT LIVE STATE: one policy, "admin_all_dna_records", FOR ALL,
--   USING (true), WITH CHECK (true), roles={public}. Confirmed live via
--   pg_policies on 2026-09-09 — anon can SELECT/INSERT/UPDATE/DELETE every row.
-- WHY CHANGE: dna_records holds internal producer/artist creative-identity
--   IP (archetype, brand positioning, Suno metatag rules) — architecture
--   doc's "internal catalog data = default deny" applies directly. This is
--   the single highest-severity live finding in the whole security audit.
-- EXPECTED AFTER STATE: CMS-role-gated read AND write only, matching the
--   pattern already correct on every non-open table in this schema
--   (artists, releases, contracts, documents, ...).
-- ROLLBACK: DROP POLICY "cms read dna_records" ON dna_records;
--           DROP POLICY "cms write dna_records" ON dna_records;
--           CREATE POLICY "admin_all_dna_records" ON dna_records FOR ALL
--             USING (true) WITH CHECK (true);
--           (Restores the exact prior state — but re-creates the open
--           security hole; only use in a genuine emergency and re-file the
--           regression immediately.)
-- DEPENDENCY / BLAST RADIUS: lib/db/dna.ts and app/actions/dna.ts are the
--   only two files in the repo that touch dna_records, both import the
--   SERVICE-ROLE client (lib/db/supabase.ts) exclusively, and every write
--   path in app/actions/dna.ts is gated by requireAdmin(). Service-role
--   bypasses RLS entirely, so this policy has never actually been what makes
--   dna.ts work. Zero legitimate code path depends on the open policy.
--   Confirmed: no public route references dna_records at all.
DROP POLICY IF EXISTS "admin_all_dna_records" ON dna_records;
CREATE POLICY "cms read dna_records"  ON dna_records FOR SELECT USING (is_cms_role());
CREATE POLICY "cms write dna_records" ON dna_records FOR ALL    USING (is_cms_role()) WITH CHECK (is_cms_role());

-- ============================================================================
-- 2. import_logs — fully open (read AND write), worse than PR #21 documented
-- ============================================================================
-- CURRENT LIVE STATE: one policy, "admin_all_import_logs", FOR ALL,
--   USING (true), WITH CHECK (true), roles={public}. PR #21's audit assumed
--   only SELECT was open ("service-role only writes") — live state shows the
--   single policy covers ALL commands, so INSERT/UPDATE/DELETE were open too.
-- WHY CHANGE: same default-deny rationale; import batch history is internal
--   operational data with no public use case.
-- EXPECTED AFTER STATE: CMS-role-gated SELECT only. No INSERT/UPDATE/DELETE
--   policy is created at all — matching how the app actually writes this
--   table (exclusively via the service-role client, which bypasses RLS and
--   needs no policy to keep working).
-- ROLLBACK: DROP POLICY "cms read import_logs" ON import_logs;
--           CREATE POLICY "admin_all_import_logs" ON import_logs FOR ALL
--             USING (true) WITH CHECK (true);
-- DEPENDENCY / BLAST RADIUS: only app/actions/imports.ts writes import_logs,
--   via the service-role client, gated by requireAdmin() on every exported
--   action (confirmed 3 call sites). Only app/admin/{command-center,logs,
--   activity}/page.tsx read it, same service-role client, same admin-only
--   route tree. No worker, no public route, touches this table.
DROP POLICY IF EXISTS "admin_all_import_logs" ON import_logs;
CREATE POLICY "cms read import_logs" ON import_logs FOR SELECT USING (is_cms_role());

-- ============================================================================
-- 3. artist_spotify_snapshots — write-policy fix ONLY (see rationale below)
-- ============================================================================
-- CURRENT LIVE STATE: two policies. "public read artist snapshots"
--   (SELECT, USING true) — untouched by this migration, see below.
--   "cms write artist snapshots" (FOR ALL, USING/WITH CHECK
--   auth.role() = 'authenticated') — grants INSERT/UPDATE/DELETE to ANY
--   signed-in user, not just CMS roles. This is the only write policy in the
--   entire 53-table schema that gates on session-authenticated-ness alone
--   instead of a role check.
-- WHY CHANGE (write side): no code path relies on a non-CMS authenticated
--   user writing here — app/actions/spotify.ts's refreshArtistSpotifySnapshot
--   already writes via the service-role client (bypasses RLS regardless of
--   this policy). Tightening to is_cms_role() closes a real gap with zero
--   functional cost.
-- WHY NOT ALSO FIX THE SELECT (read) POLICY IN THIS FILE: traced every
--   caller. Zero public-site routes reference artist_spotify_snapshots at
--   all (confirmed: no match in app/artists, app/releases, app/songs,
--   app/producers, app/brands, the homepage, or any shared component). The
--   ONLY reader is lib/cms/index.ts::getArtistSpotifySnapshots(), called
--   exclusively from three ADMIN surfaces (app/admin/spotify/page.tsx,
--   app/admin/analytics/page.tsx, components/admin/intelligence/
--   SpotifyArtistRow.tsx) — but that function builds its own Supabase client
--   from NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with NO session attached
--   (lib/cms/index.ts::getSupabaseClient()), so it queries as literal
--   anonymous `anon`, not as the logged-in admin. Restricting SELECT to
--   is_cms_role() today would make those three admin dashboards silently
--   render zero snapshot rows (no error — the query just returns empty),
--   because the ADMIN CODE PATH ITSELF currently depends on the open policy
--   to work, not any real public requirement. Fixing that requires an app
--   code change (point those two lib/cms/index.ts functions at the
--   service-role client, matching every other admin data-fetch in this
--   codebase) which is out of scope for a SQL-only migration-hardening pass.
--   Promote the SELECT restriction in a follow-up migration ONLY after that
--   code change ships and is verified — see docs/SUMG_NEXT_MIGRATION_DECISION.md.
-- EXPECTED AFTER STATE: write policy CMS-role-gated; read policy UNCHANGED
--   (still public/anon-readable — intentionally deferred, not forgotten).
-- ROLLBACK: DROP POLICY "cms write artist snapshots" ON artist_spotify_snapshots;
--           CREATE POLICY "cms write artist snapshots" ON artist_spotify_snapshots
--             FOR ALL USING (auth.role() = 'authenticated')
--             WITH CHECK (auth.role() = 'authenticated');
-- DEPENDENCY / BLAST RADIUS: write side — none (service-role writes only, in
--   practice). Read side — deliberately not in blast radius of this file.
DROP POLICY IF EXISTS "cms write artist snapshots" ON artist_spotify_snapshots;
CREATE POLICY "cms write artist snapshots" ON artist_spotify_snapshots
  FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());

-- ============================================================================
-- 4. apple_metrics_daily — public SELECT has zero legitimate dependency
-- ============================================================================
-- CURRENT LIVE STATE: two policies. "public read apple metrics" (SELECT,
--   USING true). "cms write apple metrics" (FOR ALL, is_cms_role()) — write
--   side is already correct, untouched here.
-- WHY CHANGE: unlike artist_spotify_snapshots, this table's ONLY consumer
--   anywhere in the repo is lib/db/appleMusic.ts, which exclusively uses the
--   service-role client (confirmed: `import { supabase } from "./supabase"`
--   — the service-role constructor). Its callers
--   (app/api/apple-music/link-{artist,release,song}/route.ts) are gated by
--   getAuthUser() + isExecutiveRole() before ever reaching the DB call. No
--   admin-dashboard-anon-client pattern exists here like it does for
--   artist_spotify_snapshots — this table has no reader that depends on the
--   open policy at all.
-- EXPECTED AFTER STATE: CMS-role-gated SELECT, matching the write policy.
-- ROLLBACK: DROP POLICY "cms read apple metrics" ON apple_metrics_daily;
--           CREATE POLICY "public read apple metrics" ON apple_metrics_daily
--             FOR SELECT USING (true);
-- DEPENDENCY / BLAST RADIUS: none found. Safe to apply without any
--   coordinated code change.
DROP POLICY IF EXISTS "public read apple metrics" ON apple_metrics_daily;
CREATE POLICY "cms read apple metrics" ON apple_metrics_daily FOR SELECT USING (is_cms_role());

-- Reversal (full file): see the per-statement ROLLBACK comments above; each
-- is independently reversible without touching the other three.
