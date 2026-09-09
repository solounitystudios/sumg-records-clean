-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A0 — RLS hardening. Closes the open (USING(true)) policies documented in
-- docs/SUMG_CATALOG_SECURITY_AUDIT.md §2. Additive/reversible: only DROP POLICY
-- + CREATE POLICY, no table structure changes, no data changes.
--
-- Independent of A1-A5; safe to apply alone.

-- ── dna_records: was full read+write with no auth check ──────────────────────
DROP POLICY IF EXISTS "dna_records_open_policy" ON dna_records;
-- (Exact existing policy name may differ — see supabase/migrations/20260425000000_dna_records.sql:51-53.
--  Reviewer must confirm the live policy name before applying; DROP POLICY IF EXISTS is a no-op if it doesn't match.)

CREATE POLICY "cms read dna_records"  ON dna_records FOR SELECT USING (is_cms_role());
CREATE POLICY "cms write dna_records" ON dna_records FOR ALL    USING (is_cms_role()) WITH CHECK (is_cms_role());

-- ── import_logs: was open read, no write policy (service-role only writes) ───
DROP POLICY IF EXISTS "admin_all_import_logs" ON import_logs;

CREATE POLICY "cms read import_logs" ON import_logs FOR SELECT USING (is_cms_role());
-- No public/anon write policy is created — writes continue via the service-role
-- client only, matching how import_logs is written today (app/actions/imports.ts).

-- ── artist_spotify_snapshots: analytics snapshots, was open SELECT ───────────
DROP POLICY IF EXISTS "public read artist_spotify_snapshots" ON artist_spotify_snapshots;

CREATE POLICY "cms read artist_spotify_snapshots" ON artist_spotify_snapshots FOR SELECT USING (is_cms_role());

-- ── apple_metrics_daily: analytics snapshots, was open SELECT ────────────────
DROP POLICY IF EXISTS "public read apple_metrics_daily" ON apple_metrics_daily;
-- (Exact existing policy name may differ — see supabase/migrations/20260426000000_apple_music_integration.sql:49.)

CREATE POLICY "cms read apple_metrics_daily" ON apple_metrics_daily FOR SELECT USING (is_cms_role());

-- Reversal: re-create the original USING(true) policies from the migrations
-- cited above, in each case DROP POLICY IF EXISTS the "cms read ..." policy
-- created here first.
