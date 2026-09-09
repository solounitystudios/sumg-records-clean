-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A5 — Audit Log. Additive only.
-- Depends on: nothing at the DB level. Deliberately append-only (no UPDATE
-- policy, no DELETE policy) so the log cannot be edited after the fact by
-- any role, including admin, through the normal client.

CREATE TABLE IF NOT EXISTS catalog_audit_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor               TEXT        NOT NULL,
  action              TEXT        NOT NULL,
  object_type         TEXT        NOT NULL,
  object_id           TEXT        NOT NULL,
  previous_state      JSONB,
  new_state           JSONB,
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  job_id              TEXT,
  reason              TEXT,
  approval            TEXT,
  automation_rule_id  TEXT,
  source               TEXT,
  destination          TEXT
);
CREATE INDEX IF NOT EXISTS catalog_audit_log_object_idx
  ON catalog_audit_log (object_type, object_id);
CREATE INDEX IF NOT EXISTS catalog_audit_log_occurred_idx
  ON catalog_audit_log (occurred_at);

ALTER TABLE catalog_audit_log ENABLE ROW LEVEL SECURITY;

-- read: any CMS role. write: insert-only, no update/delete policy exists at all.
CREATE POLICY "cms read catalog_audit_log"   ON catalog_audit_log FOR SELECT USING (is_cms_role());
CREATE POLICY "cms insert catalog_audit_log" ON catalog_audit_log FOR INSERT WITH CHECK (is_cms_role());

-- Reversal: DROP TABLE IF EXISTS catalog_audit_log.
