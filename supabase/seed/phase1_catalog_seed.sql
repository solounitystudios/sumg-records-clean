-- ============================================================
-- SUMG Records — Phase 1 Catalog Seed
-- ============================================================
-- This file intentionally does NOT insert fake songs or releases.
-- Real SUMG catalog data should come from Distro CSV import.
--
-- Purpose:
-- 1. Keep the seed file valid and non-empty.
-- 2. Document that catalog data is import-driven.
-- 3. Prevent accidental fake/demo catalog records.
--
-- Do NOT move this file into supabase/migrations.
-- Do NOT use this file as production catalog data.
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'SUMG Phase 1 seed loaded. No catalog rows inserted. Catalog is populated from Distro CSV imports.';
END $$;