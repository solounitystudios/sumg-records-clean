-- Migration: YouTube upload engine — OAuth credentials + engine logs
-- Created: 2026-04-30

-- ─── OAuth fields on yt_channels ─────────────────────────────────────────────
ALTER TABLE yt_channels
  ADD COLUMN IF NOT EXISTS oauth_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_token_expiry  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS oauth_scope         TEXT,
  ADD COLUMN IF NOT EXISTS oauth_connected_at  TIMESTAMPTZ;

-- ─── Video URL on yt_upload_jobs ─────────────────────────────────────────────
ALTER TABLE yt_upload_jobs
  ADD COLUMN IF NOT EXISTS yt_video_url TEXT;

-- ─── Engine log table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS yt_engine_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID        REFERENCES yt_upload_jobs(id) ON DELETE SET NULL,
  channel_id  UUID        REFERENCES yt_channels(id)   ON DELETE SET NULL,
  level       TEXT        NOT NULL DEFAULT 'info'
                          CHECK (level IN ('info', 'warn', 'error')),
  message     TEXT        NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS yt_engine_logs_created_idx ON yt_engine_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS yt_engine_logs_job_idx     ON yt_engine_logs (job_id);
CREATE INDEX IF NOT EXISTS yt_engine_logs_level_idx   ON yt_engine_logs (level);

ALTER TABLE yt_engine_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'yt_engine_logs'
      AND policyname = 'admin_all_yt_engine_logs'
  ) THEN
    CREATE POLICY "admin_all_yt_engine_logs"
      ON yt_engine_logs FOR ALL
      USING (
        ((auth.jwt() -> 'app_metadata') ->> 'role')
        = ANY (ARRAY['admin','editor','media_manager','release_manager'])
      )
      WITH CHECK (
        ((auth.jwt() -> 'app_metadata') ->> 'role')
        = ANY (ARRAY['admin','editor','media_manager','release_manager'])
      );
  END IF;
END $$;
