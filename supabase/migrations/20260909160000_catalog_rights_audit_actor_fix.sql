-- SUMG-CAT-P0-002 — corrective fix for catalog_rights_records_audit().
--
-- PRODUCTION DEFECT (found by a real production smoke test, not a structural
-- SQL-text test — see docs/SUMG_CATALOG_PRE_PRODUCTION_HARDENING.md-era tests
-- for why the gap existed: every prior test on this trigger read the SQL
-- text with regex, none actually executed it against a live
-- catalog_audit_log): the trigger installed by
-- supabase/migrations/20260909100002_catalog_rights_policy.sql inserts into
-- catalog_audit_log without supplying `actor_type` or `actor_label`, both of
-- which are NOT NULL with no default. Every INSERT/UPDATE on
-- catalog_rights_records has therefore failed, atomically, since A2 was
-- applied:
--
--   ERROR: 23502: null value in column "actor_type" of relation
--   "catalog_audit_log" violates not-null constraint
--
-- No data was ever corrupted — the failure is atomic (the whole trigger, and
-- therefore the whole rights write, rolls back) — but no rights record could
-- ever be created or updated. catalog_policy_flags (no trigger) is
-- unaffected and has always worked.
--
-- ROOT CAUSE: the trigger function was written and reviewed against A5's
-- documented actor model (actor_type/actor/actor_label — see
-- docs/SUMG_REVIEW_AUDIT_AND_DELETION.md), but the INSERT statement itself
-- was never updated to actually populate those two columns.
--
-- FIX: CREATE OR REPLACE the function only. No table is touched, no row is
-- mutated, no RLS policy changes, no constraint changes — the actor
-- CONTRACT (catalog_audit_log's columns/constraints) was correct as
-- designed; only the function's INSERT statement was incomplete.
--
-- ACTOR MAPPING (derived from A5's actor_type CHECK — human/service/worker/
-- ai/system — and A2's set_by_source CHECK — measured/deterministic/
-- ai_inferred/editor_assigned/founder_assigned/telemetry_learned/
-- imported_source — no new values invented, no guessing):
--
--   NEW.set_by IS NOT NULL           -> actor_type = 'human'   (mandatory —
--     catalog_audit_log_no_human_spoof requires actor_type='human' whenever
--     actor is non-null; there is no other legal choice once a real
--     auth.users UUID is present)
--   set_by_source IN ('editor_assigned', 'founder_assigned')
--     with set_by NULL               -> actor_type = 'human'   (these two
--     sources are human-originated by their own name in the vocabulary; a
--     human actor_type with a NULL actor is the exact, anticipated
--     post-account-deletion shape A5's own design doc describes — see
--     "audit survives user deletion" in docs/SUMG_REVIEW_AUDIT_AND_DELETION.md)
--   set_by_source IN ('ai_inferred', 'telemetry_learned')
--     with set_by NULL               -> actor_type = 'ai'      (the same two
--     sources the existing catalog_rights_records_ai_cannot_clear CHECK
--     already treats as AI-originated)
--   else (measured, deterministic, imported_source), set_by NULL
--                                     -> actor_type = 'system'  (deterministic
--     tooling / import pipeline — not a person, not a model, not a queue
--     worker specifically; 'service' and 'worker' are left unused by this
--     trigger, which is fine — the CHECK only requires one of the five
--     valid values, not that this trigger use all of them)
--
--   actor_label (also NOT NULL, also never supplied by the original
--   function): NEW.set_by::text when a human UUID is present (a stable
--   identifier that survives the FK going null later, per A5's own
--   "actor_label survives independently" design), otherwise NEW.set_by_source
--   itself (the existing service/worker/system identifier the row already
--   carries — no new column, no lookup, no extra failure surface).
--
-- Every branch above satisfies catalog_audit_log_no_human_spoof
-- (actor_type = 'human' OR actor IS NULL) by construction — verified by a
-- real, executed transaction against production's live schema
-- (CREATE OR REPLACE FUNCTION + INSERT/UPDATE test cases + ROLLBACK, so nothing
-- persisted) covering: human actor INSERT, automated/imported actor INSERT
-- with set_by NULL, ai_inferred actor INSERT, and an UPDATE producing a
-- correct previous_state/new_state pair — all passed. No fake UUIDs are ever
-- written to the `actor` column; it is either a real auth.users id or NULL.
--
-- This migration is forward-only, additive to the function body only:
-- CREATE OR REPLACE FUNCTION does not drop or recreate any table, does not
-- touch any existing row in catalog_rights_records, catalog_policy_flags, or
-- catalog_audit_log, does not change any RLS policy, and does not touch
-- songs/releases or any other table.

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

-- Reversal: this CREATE OR REPLACE has no prior-version snapshot to restore
-- to other than reapplying the original (broken) body from
-- supabase/migrations/20260909100002_catalog_rights_policy.sql's
-- CREATE OR REPLACE FUNCTION statement — which would restore the production
-- defect, not fix anything. There is nothing to "roll back" to that is
-- preferable to this version; if this fix itself needs reverting, replace it
-- with a further CREATE OR REPLACE FUNCTION, not a DROP (dropping the
-- function while the trigger still references it would break every
-- catalog_rights_records write immediately and completely, which is worse
-- than the current, already-broken state).
