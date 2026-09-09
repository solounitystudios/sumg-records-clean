-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A5 — Audit Log. Additive only. Deliberately append-only (no UPDATE
-- policy, no DELETE policy) so the log cannot be edited after the fact by
-- any role, including admin, through the normal client.
--
-- REVISED 2026-09-09 (security-migration-hardening pass): actor TEXT ->
-- UUID REFERENCES auth.users(id), same reasoning as A1/A2. Nullable (unlike
-- catalog_asset_versions.uploaded_by) because a genuinely non-human,
-- automation-triggered event is a real, intended future case for this
-- table — when actor IS NULL, automation_rule_id (already present) is
-- expected to be populated instead; a row with both null is a data-quality
-- bug to catch in review, not a schema-level impossibility, since forcing
-- NOT NULL here would make automation-only events unrepresentable. Every
-- event this table needs to record for the V1 milestone
-- (docs/SUMG_MANUAL_INTAKE_V1_PLAN.md §8: UPLOAD_INITIATED, MASTER_SECURED,
-- HASH_VERIFIED, CATALOG_RECORD_CREATED, REVIEW_DECISION,
-- RIGHTS_STATE_CHANGED, ROUTE_APPROVED) is human-initiated, so actor will
-- always be populated in practice for V1 — the nullability exists for the
-- schema's future, not V1's actual writes.

CREATE TABLE IF NOT EXISTS catalog_audit_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor               UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
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
