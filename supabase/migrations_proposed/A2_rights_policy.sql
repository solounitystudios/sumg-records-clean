-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A2 — Rights / Policy. Additive only.
-- Depends on: nothing at the DB level (subject_type/subject_id is a loose
-- polymorphic reference, not an FK, matching the existing repo convention of
-- e.g. finance_transactions.artist_slug / release_slug being unconstrained
-- text rather than FKs).

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
  -- distribution / sync / personaworks / ai_training permission booleans, each
  -- defaulting to false (unknown does not imply permission).
  permissions          JSONB      NOT NULL DEFAULT '{}',
  set_by               TEXT       NOT NULL,
  set_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_rights_records_subject_idx
  ON catalog_rights_records (subject_type, subject_id);

-- set_by must never be 'ai' when status is 'cleared' — AI can describe
-- evidence but must never clear rights. Enforced here AND in
-- lib/catalog/rights.ts (defense in depth: the app-level check is the primary
-- one since it runs before any DB write and can give a better error message;
-- this CHECK is the backstop against a bug or a future direct-SQL write path).
ALTER TABLE catalog_rights_records
  ADD CONSTRAINT catalog_rights_records_ai_cannot_clear
  CHECK (NOT (status = 'cleared' AND set_by = 'ai'));

CREATE TABLE IF NOT EXISTS catalog_policy_flags (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type  TEXT        NOT NULL CHECK (subject_type IN ('work', 'recording', 'song', 'release')),
  subject_id    TEXT        NOT NULL,
  flag          TEXT        NOT NULL CHECK (flag IN
                   ('DO_NOT_RELEASE', 'DO_NOT_PROGRAM', 'DO_NOT_DISTRIBUTE', 'DO_NOT_SYNC',
                    'DO_NOT_TRAIN_AI', 'DO_NOT_PUBLISH', 'DO_NOT_DELETE', 'PRIVATE_PERSONAL', 'RIGHTS_HOLD')),
  reason        TEXT        NOT NULL DEFAULT '',
  set_by        TEXT        NOT NULL,
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
