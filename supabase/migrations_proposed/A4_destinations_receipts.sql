-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A4 — Destinations / Receipts. Additive only.
-- Depends on: nothing at the DB level.
--
-- Note: 'personaworks' appearing as a valid destination value is a schema
-- placeholder only. This migration does not connect to PersonaWorks, create
-- any network path to it, or grant it access — see
-- docs/SUMG_CATALOG_COMMAND_CENTER_ARCHITECTURE.md §7.

CREATE TABLE IF NOT EXISTS catalog_destination_assignments (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type         TEXT        NOT NULL CHECK (subject_type IN ('work', 'recording', 'song', 'release')),
  subject_id           TEXT        NOT NULL,
  destination          TEXT        NOT NULL CHECK (destination IN
                          ('sumg_public', 'sumg_artist_catalog', 'sumg_project',
                           'personaworks', 'distribution', 'sync', 'social', 'archive')),
  status               TEXT        NOT NULL DEFAULT 'requested' CHECK (status IN
                          ('requested', 'approved', 'rejected', 'blocked', 'delivered')),
  approved_by          TEXT,
  approved_at          TIMESTAMPTZ,
  version              INTEGER     NOT NULL DEFAULT 1,
  destination_asset_id TEXT,
  failure_reason       TEXT,
  policy_reason        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status = 'approved') = (approved_by IS NOT NULL AND approved_at IS NOT NULL) OR status IN ('delivered'))
);
CREATE INDEX IF NOT EXISTS catalog_destination_assignments_subject_idx
  ON catalog_destination_assignments (subject_type, subject_id);

CREATE TABLE IF NOT EXISTS catalog_delivery_receipts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID        NOT NULL REFERENCES catalog_destination_assignments(id) ON DELETE CASCADE,
  delivered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  receipt       JSONB       NOT NULL DEFAULT '{}',
  checksum      TEXT
);
CREATE INDEX IF NOT EXISTS catalog_delivery_receipts_assignment_idx
  ON catalog_delivery_receipts (assignment_id);

ALTER TABLE catalog_destination_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_delivery_receipts       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms all catalog_destination_assignments" ON catalog_destination_assignments FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_delivery_receipts"       ON catalog_delivery_receipts       FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());

-- Reversal: DROP TABLE IF EXISTS catalog_delivery_receipts, catalog_destination_assignments.
