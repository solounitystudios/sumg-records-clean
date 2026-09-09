-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A2 — Rights / Policy. Additive only.
-- Depends on: nothing at the DB level (subject_type/subject_id is a loose
-- polymorphic reference, not an FK, matching the existing repo convention of
-- e.g. finance_transactions.artist_slug / release_slug being unconstrained
-- text rather than FKs).
--
-- REVISED 2026-09-09 (security-migration-hardening pass) after an explicit
-- challenge against the locked rights semantics — see
-- docs/SUMG_SECURITY_MIGRATION_HARDENING.md §12. Three changes from the
-- version reviewed in the production-verification pass:
--
--   1. set_by: TEXT -> UUID REFERENCES auth.users(id) ON DELETE SET NULL,
--      same reasoning as A1's created_by/uploaded_by (real identity primitive
--      instead of a hopeful string).
--
--   2. NEW set_by_source column, mirroring lib/catalog/types.ts's
--      ProvenanceSource enum exactly. The AI-cannot-clear backstop
--      previously compared set_by (an identity string) to the literal 'ai' —
--      fragile, since nothing forced callers to spell an AI actor's identity
--      that way. The backstop now checks set_by_source instead, the same
--      provenance-source vocabulary the domain layer's
--      lib/catalog/rights.ts::assertAiCannotClear() already uses
--      ('ai_inferred' / 'telemetry_learned' can never accompany
--      status='cleared'), so the DB-level defense-in-depth check and the
--      app-level primary check now key off the exact same concept instead of
--      two different, driftable ones.
--
--   3. permissions default: '{}' -> an explicit all-false object. An empty
--      object and an explicit {"distribution": false, ...} both evaluate
--      identically through lib/catalog/rights.ts::hasPermission() (a missing
--      key and an explicit false both fail the `=== true` check) — but a
--      future direct-SQL or non-TypeScript reader querying
--      permissions->>'distribution' would get NULL from a missing key
--      (ambiguous — "never considered" vs. "explicitly denied") instead of
--      the literal string 'false' (unambiguous). Costs nothing, removes an
--      ambiguity class entirely.
--
--   4. Added UNIQUE (subject_type, subject_id) to catalog_rights_records:
--      this table models MUTABLE CURRENT STATE — one row per subject,
--      updated in place — not a history table. Rights-state-change history
--      (RIGHTS_STATE_CHANGED, with previous/new state) lives in A5's
--      catalog_audit_log, which already exists for exactly this purpose per
--      docs/SUMG_MANUAL_INTAKE_V1_PLAN.md §8. Building a second, parallel
--      history mechanism inside catalog_rights_records itself would be the
--      overbuilt schema Part 12 explicitly warns against; the unique
--      constraint makes the "one current row per subject" intent
--      structurally enforced instead of merely assumed.

CREATE TABLE IF NOT EXISTS catalog_rights_records (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type        TEXT        NOT NULL CHECK (subject_type IN ('work', 'recording', 'song', 'release')),
  subject_id          TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'unknown' CHECK (status IN
                         ('unknown', 'under_review', 'cleared', 'restricted', 'denied', 'expired')),
  owner_entity        TEXT,
  territory            TEXT,
  evidence_document_id UUID       REFERENCES documents(id) ON DELETE SET NULL,
  contract_id          UUID       REFERENCES contracts(id) ON DELETE SET NULL,
  -- distribution / sync / personaworks / ai_training permission booleans,
  -- explicitly false by default (unknown does not imply permission — a
  -- missing key and an explicit false both mean "no", but explicit removes
  -- ambiguity for any reader that isn't lib/catalog/rights.ts).
  permissions          JSONB      NOT NULL DEFAULT
                          '{"distribution": false, "sync": false, "personaworks": false, "aiTraining": false}'::jsonb,
  set_by                UUID       REFERENCES auth.users(id) ON DELETE SET NULL,
  set_by_source         TEXT       NOT NULL CHECK (set_by_source IN
                           ('measured', 'deterministic', 'ai_inferred', 'editor_assigned',
                            'founder_assigned', 'telemetry_learned', 'imported_source')),
  set_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id)
);
CREATE INDEX IF NOT EXISTS catalog_rights_records_subject_idx
  ON catalog_rights_records (subject_type, subject_id);

-- set_by_source must never be an AI-authored source when status is
-- 'cleared' — AI can describe evidence but must never clear rights.
-- Enforced here AND in lib/catalog/rights.ts (defense in depth: the
-- app-level check is the primary one since it runs before any DB write and
-- can give a better error message; this CHECK is the backstop against a bug
-- or a future direct-SQL write path).
ALTER TABLE catalog_rights_records
  ADD CONSTRAINT catalog_rights_records_ai_cannot_clear
  CHECK (NOT (status = 'cleared' AND set_by_source IN ('ai_inferred', 'telemetry_learned')));

CREATE TABLE IF NOT EXISTS catalog_policy_flags (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type  TEXT        NOT NULL CHECK (subject_type IN ('work', 'recording', 'song', 'release')),
  subject_id    TEXT        NOT NULL,
  flag          TEXT        NOT NULL CHECK (flag IN
                   ('DO_NOT_RELEASE', 'DO_NOT_PROGRAM', 'DO_NOT_DISTRIBUTE', 'DO_NOT_SYNC',
                    'DO_NOT_TRAIN_AI', 'DO_NOT_PUBLISH', 'DO_NOT_DELETE', 'PRIVATE_PERSONAL', 'RIGHTS_HOLD')),
  reason        TEXT        NOT NULL DEFAULT '',
  set_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  set_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id, flag)
);
CREATE INDEX IF NOT EXISTS catalog_policy_flags_subject_idx
  ON catalog_policy_flags (subject_type, subject_id);

ALTER TABLE catalog_rights_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_policy_flags   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms all catalog_rights_records" ON catalog_rights_records FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_policy_flags"   ON catalog_policy_flags   FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());

-- Reversal: DROP TABLE IF EXISTS catalog_policy_flags, catalog_rights_records.
