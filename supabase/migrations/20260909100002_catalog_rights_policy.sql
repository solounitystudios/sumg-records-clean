-- A2 — Rights / Policy. Additive only.
--
-- Promoted from supabase/migrations_proposed/A2_rights_policy.sql (design
-- history and full reasoning there, including docs/SUMG_RIGHTS_AND_ROUTING_MODEL.md).
--
-- Depends on: 20260909100001_catalog_audit_log.sql (A5) — this table's DDL
-- (CREATE TABLE/FUNCTION/TRIGGER) succeeds even if catalog_audit_log doesn't
-- exist, but every write to catalog_rights_records will fail at RUNTIME with
-- "relation catalog_audit_log does not exist" until A5 is also applied. Both
-- are promoted together in this migration pair, A5 first by timestamp.
--
-- RIGHTS HISTORY MODEL: every INSERT/UPDATE on catalog_rights_records
-- unconditionally writes a 'rights_changed' event to catalog_audit_log (A5)
-- with the full before/after row state. This is DB-enforced, not
-- convention-enforced — no code path (including a future direct-SQL fix, a
-- service-role bug, or a forgotten audit call) can change rights state
-- without leaving a trail.
--
-- PERMISSIONS SHAPE IS DB-VALIDATED: a CHECK constraint requires exactly the
-- four known keys (distribution/sync/personaworks/aiTraining), each a JSON
-- boolean, no extra keys — matching lib/catalog/types.ts's
-- RightsPermissions / lib/catalog/destinations.ts's CatalogDestination
-- routing vocabulary already implemented and tested in this repo.
--
-- set_by is UUID REFERENCES auth.users(id); set_by_source mirrors
-- lib/catalog/types.ts's ProvenanceSource and backs the AI-cannot-clear
-- CHECK; permissions defaults to an explicit all-false object;
-- UNIQUE(subject_type, subject_id) makes catalog_rights_records a
-- mutable-current-state table, not a history table (history is the
-- trigger-fed audit log).
--
-- expires_at (nullable): a rights grant can carry a real expiration date.
-- Expiration is NOT solely a background job's job to notice —
-- lib/catalog/rights.ts's permission checks (canDistribute, canSync, etc.)
-- treat status='cleared' with a past expires_at as equivalent to 'expired'
-- AT CHECK TIME, not only after some reconciliation job has gotten around to
-- flipping the stored status column.
--
-- subject_type/subject_id is a loose polymorphic reference, not an FK,
-- matching the existing repo convention — and deliberately covers
-- 'song'/'release' (today's real, existing catalog rows) as well as
-- 'work'/'recording' (not yet applied — A1), so this slice attaches
-- directly to production's existing 32 songs / 32 releases without waiting
-- on Master Vault or Work/Recording/Version to land.

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
  -- explicitly false by default. Shape is DB-validated below — exactly
  -- these four keys, each a JSON boolean, no more, no less.
  permissions          JSONB      NOT NULL DEFAULT
                          '{"distribution": false, "sync": false, "personaworks": false, "aiTraining": false}'::jsonb,
  set_by                UUID       REFERENCES auth.users(id) ON DELETE SET NULL,
  set_by_source         TEXT       NOT NULL CHECK (set_by_source IN
                           ('measured', 'deterministic', 'ai_inferred', 'editor_assigned',
                            'founder_assigned', 'telemetry_learned', 'imported_source')),
  set_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Nullable — most rights states have no expiration. When set, treated as
  -- authoritative at permission-check time, not just at storage time.
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id)
);
CREATE INDEX IF NOT EXISTS catalog_rights_records_subject_idx
  ON catalog_rights_records (subject_type, subject_id);

ALTER TABLE catalog_rights_records
  ADD CONSTRAINT catalog_rights_records_ai_cannot_clear
  CHECK (NOT (status = 'cleared' AND set_by_source IN ('ai_inferred', 'telemetry_learned')));

-- Permissions shape validation: exactly the four known keys, each a JSON
-- boolean. Rejects unknown keys and non-boolean values at the DB level, not
-- just by TypeScript's type system.
ALTER TABLE catalog_rights_records
  ADD CONSTRAINT catalog_rights_records_permissions_shape
  CHECK (
    permissions ?& ARRAY['distribution', 'sync', 'personaworks', 'aiTraining']
    AND (permissions - 'distribution' - 'sync' - 'personaworks' - 'aiTraining') = '{}'::jsonb
    AND jsonb_typeof(permissions -> 'distribution') = 'boolean'
    AND jsonb_typeof(permissions -> 'sync') = 'boolean'
    AND jsonb_typeof(permissions -> 'personaworks') = 'boolean'
    AND jsonb_typeof(permissions -> 'aiTraining') = 'boolean'
  );

-- Every rights-record write is unconditionally audited — DB-enforced, not
-- convention-enforced. actor_type/actor_service are not separate columns
-- here because A5's catalog_audit_log.actor is nullable and set_by is
-- already the human actor when one exists; automation-authored rows
-- (set_by IS NULL, set_by_source identifies the automated origin) audit
-- with a NULL actor, exactly matching A5's documented actor model.
CREATE OR REPLACE FUNCTION catalog_rights_records_audit() RETURNS trigger AS $$
BEGIN
  INSERT INTO catalog_audit_log (actor, action, object_type, object_id, previous_state, new_state, occurred_at, source)
  VALUES (
    NEW.set_by,
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
CREATE TRIGGER catalog_rights_records_audit_trg
  AFTER INSERT OR UPDATE ON catalog_rights_records
  FOR EACH ROW EXECUTE FUNCTION catalog_rights_records_audit();

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

-- Reversal: DROP TRIGGER catalog_rights_records_audit_trg ON catalog_rights_records;
-- DROP FUNCTION catalog_rights_records_audit();
-- DROP TABLE IF EXISTS catalog_policy_flags, catalog_rights_records.
