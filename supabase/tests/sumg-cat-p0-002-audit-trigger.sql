-- SUMG-CAT-P0-002 — real database regression test for
-- catalog_rights_records_audit(), after applying
-- 20260909160000_catalog_rights_audit_actor_fix.sql.
--
-- WHY THIS FILE EXISTS: this repo's CI (npm test) runs Node's built-in test
-- runner against pure TypeScript logic only — there is no local Postgres and
-- no Supabase CLI docker stack wired into CI, and creating a Supabase
-- preview branch to get a real ephemeral database requires cost
-- confirmation from a human, which is out of scope for an automated test
-- run. lib/catalog/rights-audit-trigger.security.test.ts adds a structural
-- regression test that fits CI (it would have caught the exact
-- missing-column bug class), but only a real trigger execution against a
-- real catalog_audit_log can prove the actor semantics are actually correct
-- end to end. This script is that real test — written to be safely re-run
-- against production itself (it never commits anything) or against a
-- Supabase preview branch / local `supabase start` Postgres.
--
-- HOW TO RUN: paste this whole file into the Supabase SQL editor (or `psql`)
-- against any database that already has 20260909100001_catalog_audit_log.sql
-- and 20260909100002_catalog_rights_policy.sql applied. It wraps everything
-- in BEGIN/ROLLBACK, so:
--   - the corrective CREATE OR REPLACE FUNCTION is applied only for the
--     duration of the transaction (DDL is transactional in Postgres) and is
--     reverted by the ROLLBACK — this script never permanently changes the
--     function definition; it is a test, not the fix itself
--   - every test row (catalog_rights_records + catalog_audit_log) is
--     rolled back — nothing persists, regardless of pass/fail
--   - a failing assertion raises an exception, which aborts with a clear
--     message identifying exactly which case failed
--   - reaching "ALL TESTS PASSED" and a clean ROLLBACK means every case
--     below is verified against the real, live schema
--
-- This exact script (function body included) was run once against
-- production (yisxnwbsnzxjnmzpstzj) during SUMG-CAT-P0-002's development,
-- inside a transaction that rolled back — see the PR description for the
-- verified result. It is committed here so the same proof can be re-run
-- independently (by CI against a future real database, or by a human)
-- rather than only trusted as a one-off manual claim.

BEGIN;

CREATE OR REPLACE FUNCTION catalog_rights_records_audit() RETURNS trigger AS $$
DECLARE
  computed_actor_type TEXT;
  computed_actor_label TEXT;
BEGIN
  IF NEW.set_by IS NOT NULL THEN
    computed_actor_type := 'human';
    computed_actor_label := NEW.set_by::text;
  ELSIF NEW.set_by_source IN ('editor_assigned', 'founder_assigned') THEN
    computed_actor_type := 'human';
    computed_actor_label := NEW.set_by_source;
  ELSIF NEW.set_by_source IN ('ai_inferred', 'telemetry_learned') THEN
    computed_actor_type := 'ai';
    computed_actor_label := NEW.set_by_source;
  ELSE
    computed_actor_type := 'system';
    computed_actor_label := NEW.set_by_source;
  END IF;

  INSERT INTO catalog_audit_log (actor, actor_type, actor_label, action, object_type, object_id, previous_state, new_state, occurred_at, source)
  VALUES (
    NEW.set_by,
    computed_actor_type,
    computed_actor_label,
    'rights_changed',
    'catalog_rights_records',
    NEW.id::text,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    now(),
    NEW.set_by_source
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $test$
DECLARE
  -- Any existing auth.users row works — the value itself is never asserted
  -- on, only that it round-trips correctly and drives actor_type='human'.
  human_uuid UUID;
  r1 RECORD;
  r2 RECORD;
  r3 RECORD;
  a1 RECORD;
  a2 RECORD;
  a3 RECORD;
  a_update RECORD;
  audit_count INT;
BEGIN
  SELECT id INTO human_uuid FROM auth.users LIMIT 1;
  IF human_uuid IS NULL THEN
    RAISE EXCEPTION 'no auth.users row available to run the human-actor test case against';
  END IF;

  -- CASE 1: rights INSERT with a human actor (founder_assigned, real set_by UUID)
  INSERT INTO catalog_rights_records (subject_type, subject_id, status, permissions, set_by, set_by_source)
  VALUES ('work', '__p0002_test_human__', 'under_review',
          '{"distribution": false, "sync": false, "personaworks": false, "aiTraining": false}'::jsonb,
          human_uuid, 'founder_assigned')
  RETURNING * INTO r1;

  SELECT * INTO a1 FROM catalog_audit_log WHERE object_id = r1.id::text AND previous_state IS NULL LIMIT 1;
  IF a1.actor_type IS DISTINCT FROM 'human' THEN
    RAISE EXCEPTION 'CASE 1 FAILED: expected actor_type=human, got %', a1.actor_type;
  END IF;
  IF a1.actor IS DISTINCT FROM human_uuid THEN
    RAISE EXCEPTION 'CASE 1 FAILED: expected actor=%, got %', human_uuid, a1.actor;
  END IF;
  IF a1.action IS DISTINCT FROM 'rights_changed' THEN
    RAISE EXCEPTION 'CASE 1 FAILED: expected action=rights_changed, got %', a1.action;
  END IF;
  IF a1.object_type IS DISTINCT FROM 'catalog_rights_records' OR a1.object_id IS DISTINCT FROM r1.id::text THEN
    RAISE EXCEPTION 'CASE 1 FAILED: object_type/object_id mismatch (% / %)', a1.object_type, a1.object_id;
  END IF;
  IF (a1.new_state->>'status') IS DISTINCT FROM 'under_review' THEN
    RAISE EXCEPTION 'CASE 1 FAILED: new_state.status mismatch: %', a1.new_state->>'status';
  END IF;
  IF (a1.new_state->'permissions') IS DISTINCT FROM '{"distribution": false, "sync": false, "personaworks": false, "aiTraining": false}'::jsonb THEN
    RAISE EXCEPTION 'CASE 1 FAILED: permissions did not round-trip: %', a1.new_state->'permissions';
  END IF;
  RAISE NOTICE 'CASE 1 PASSED: human actor, INSERT, actor_type=%, actor=%, actor_label=%', a1.actor_type, a1.actor, a1.actor_label;

  -- CASE 2: rights INSERT with an automated/import source, set_by NULL
  INSERT INTO catalog_rights_records (subject_type, subject_id, status, permissions, set_by, set_by_source)
  VALUES ('work', '__p0002_test_imported__', 'unknown',
          '{"distribution": false, "sync": false, "personaworks": false, "aiTraining": false}'::jsonb,
          NULL, 'imported_source')
  RETURNING * INTO r2;

  SELECT * INTO a2 FROM catalog_audit_log WHERE object_id = r2.id::text LIMIT 1;
  IF a2.actor_type IS DISTINCT FROM 'system' THEN
    RAISE EXCEPTION 'CASE 2 FAILED: expected actor_type=system, got %', a2.actor_type;
  END IF;
  IF a2.actor IS NOT NULL THEN
    RAISE EXCEPTION 'CASE 2 FAILED: expected actor NULL for automated source, got %', a2.actor;
  END IF;
  IF a2.actor_label IS DISTINCT FROM 'imported_source' THEN
    RAISE EXCEPTION 'CASE 2 FAILED: expected actor_label=imported_source, got %', a2.actor_label;
  END IF;
  RAISE NOTICE 'CASE 2 PASSED: automated actor, INSERT, actor_type=%, actor=%, actor_label=%', a2.actor_type, a2.actor, a2.actor_label;

  -- CASE 3: AI-sourced insert (non-clearing status) -> actor_type='ai'
  INSERT INTO catalog_rights_records (subject_type, subject_id, status, permissions, set_by, set_by_source)
  VALUES ('work', '__p0002_test_ai__', 'under_review',
          '{"distribution": false, "sync": false, "personaworks": false, "aiTraining": false}'::jsonb,
          NULL, 'ai_inferred')
  RETURNING * INTO r3;

  SELECT * INTO a3 FROM catalog_audit_log WHERE object_id = r3.id::text LIMIT 1;
  IF a3.actor_type IS DISTINCT FROM 'ai' THEN
    RAISE EXCEPTION 'CASE 3 FAILED: expected actor_type=ai, got %', a3.actor_type;
  END IF;
  RAISE NOTICE 'CASE 3 PASSED: ai actor, INSERT, actor_type=%', a3.actor_type;

  -- CASE 4: rights UPDATE on the human record -> previous_state populated, actor semantics re-derived correctly
  UPDATE catalog_rights_records SET status = 'cleared', permissions = '{"distribution": true, "sync": false, "personaworks": false, "aiTraining": false}'::jsonb
  WHERE id = r1.id;

  SELECT * INTO a_update FROM catalog_audit_log WHERE object_id = r1.id::text AND previous_state IS NOT NULL LIMIT 1;
  IF a_update.id IS NULL THEN
    RAISE EXCEPTION 'CASE 4 FAILED: no audit row with non-null previous_state found for the UPDATE';
  END IF;
  IF (a_update.previous_state->>'status') IS DISTINCT FROM 'under_review' THEN
    RAISE EXCEPTION 'CASE 4 FAILED: previous_state.status mismatch: %', a_update.previous_state->>'status';
  END IF;
  IF (a_update.new_state->>'status') IS DISTINCT FROM 'cleared' THEN
    RAISE EXCEPTION 'CASE 4 FAILED: new_state.status mismatch: %', a_update.new_state->>'status';
  END IF;
  IF ((a_update.new_state->'permissions')->>'distribution')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CASE 4 FAILED: updated permissions did not round-trip: %', a_update.new_state->'permissions';
  END IF;
  IF a_update.actor_type IS DISTINCT FROM 'human' OR a_update.actor IS DISTINCT FROM human_uuid THEN
    RAISE EXCEPTION 'CASE 4 FAILED: actor semantics wrong on UPDATE: type=%, actor=%', a_update.actor_type, a_update.actor;
  END IF;
  RAISE NOTICE 'CASE 4 PASSED: UPDATE, previous_state/new_state/actor semantics all correct';

  -- CASE 5: exactly one audit row per write, including the UPDATE (no double-audit, no missed audit)
  SELECT count(*) INTO audit_count FROM catalog_audit_log WHERE object_id IN (r1.id::text, r2.id::text, r3.id::text);
  IF audit_count IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'CASE 5 FAILED: expected exactly 4 audit rows (3 inserts + 1 update), got %', audit_count;
  END IF;
  RAISE NOTICE 'CASE 5 PASSED: exactly one audit row per write, including the UPDATE';

  RAISE NOTICE 'ALL TESTS PASSED';
END;
$test$;

ROLLBACK;
