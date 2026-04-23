-- Import logs table
-- Tracks every CSV import run for audit and debugging.

CREATE TABLE IF NOT EXISTS import_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type   TEXT    NOT NULL,          -- 'bmi' | 'distro' | 'soundexchange'
  filename      TEXT    NOT NULL,
  total_rows    INTEGER NOT NULL DEFAULT 0,
  matched_rows  INTEGER NOT NULL DEFAULT 0,
  updated_rows  INTEGER NOT NULL DEFAULT 0,
  created_rows  INTEGER NOT NULL DEFAULT 0,
  skipped_rows  INTEGER NOT NULL DEFAULT 0,
  error_count   INTEGER NOT NULL DEFAULT 0,
  errors        JSONB,                     -- array of error strings (up to 20)
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for history page (ordered by date)
CREATE INDEX IF NOT EXISTS import_logs_imported_at_idx
  ON import_logs (imported_at DESC);

-- RLS: only service role and admin-authenticated users can read/write
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_import_logs"
  ON import_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
