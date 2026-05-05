-- import_batches: tracks each catalog import run
CREATE TABLE IF NOT EXISTS import_batches (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source         TEXT        NOT NULL DEFAULT 'catalog',
  entity_type    TEXT        NOT NULL,
  filename       TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'imported',
  total_rows     INTEGER     NOT NULL DEFAULT 0,
  created_count  INTEGER     NOT NULL DEFAULT 0,
  updated_count  INTEGER     NOT NULL DEFAULT 0,
  skipped_count  INTEGER     NOT NULL DEFAULT 0,
  conflict_count INTEGER     NOT NULL DEFAULT 0,
  invalid_count  INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_import_batches"
  ON import_batches FOR ALL
  USING (
    ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
      ARRAY['admin','editor','media_manager','release_manager']
    )
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (
      ARRAY['admin','editor','media_manager','release_manager']
    )
  );
