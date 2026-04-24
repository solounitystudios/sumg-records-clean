-- Migration: Producer Extended + YouTube Automation Scaffold
-- Created: 2026-04-27
-- Idempotent: all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ─── producers: extended fields ──────────────────────────────────────────────

ALTER TABLE producers ADD COLUMN IF NOT EXISTS status              TEXT        NOT NULL DEFAULT 'active';
ALTER TABLE producers ADD COLUMN IF NOT EXISTS image_url           TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS banner_url          TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS social_links        JSONB;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS yt_channel_url      TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS yt_handle           TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS yt_channel_id       TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS yt_upload_cadence   INTEGER     NOT NULL DEFAULT 3;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS yt_title_template       TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS yt_description_template TEXT;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS yt_default_tags         TEXT[]      NOT NULL DEFAULT '{}';
ALTER TABLE producers ADD COLUMN IF NOT EXISTS dna_slug            TEXT;

-- ─── producer_assets: audio asset bin per producer ───────────────────────────

CREATE TABLE IF NOT EXISTS producer_assets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_slug TEXT        NOT NULL,
  asset_id      TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'raw'
                            CHECK (status IN ('raw', 'queued', 'rendered', 'scheduled', 'published', 'failed')),
  notes         TEXT,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (producer_slug, asset_id)
);

CREATE INDEX IF NOT EXISTS producer_assets_producer_idx ON producer_assets (producer_slug);
CREATE INDEX IF NOT EXISTS producer_assets_status_idx   ON producer_assets (status);

ALTER TABLE producer_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'producer_assets' AND policyname = 'admin_all_producer_assets'
  ) THEN
    CREATE POLICY "admin_all_producer_assets"
      ON producer_assets FOR ALL
      USING (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']))
      WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']));
  END IF;
END $$;

-- ─── yt_channels: one row per YouTube channel linked to a producer ────────────

CREATE TABLE IF NOT EXISTS yt_channels (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_slug        TEXT        NOT NULL,
  channel_id           TEXT        NOT NULL UNIQUE,
  channel_handle       TEXT,
  channel_url          TEXT,
  upload_cadence       INTEGER     NOT NULL DEFAULT 3,
  title_template       TEXT,
  description_template TEXT,
  default_tags         TEXT[]      NOT NULL DEFAULT '{}',
  status               TEXT        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active', 'paused', 'revoked')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS yt_channels_producer_idx ON yt_channels (producer_slug);

ALTER TABLE yt_channels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'yt_channels' AND policyname = 'admin_all_yt_channels'
  ) THEN
    CREATE POLICY "admin_all_yt_channels"
      ON yt_channels FOR ALL
      USING (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']))
      WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']));
  END IF;
END $$;

-- ─── yt_upload_jobs: per-upload job queue ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS yt_upload_jobs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_slug    TEXT        NOT NULL,
  asset_id         TEXT        NOT NULL,
  yt_channel_id    UUID        NOT NULL REFERENCES yt_channels(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'processing', 'uploaded', 'failed', 'cancelled')),
  title            TEXT,
  description      TEXT,
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  scheduled_at     TIMESTAMPTZ,
  uploaded_at      TIMESTAMPTZ,
  yt_video_id      TEXT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS yt_jobs_producer_idx    ON yt_upload_jobs (producer_slug);
CREATE INDEX IF NOT EXISTS yt_jobs_status_idx      ON yt_upload_jobs (status);
CREATE INDEX IF NOT EXISTS yt_jobs_channel_idx     ON yt_upload_jobs (yt_channel_id);
CREATE INDEX IF NOT EXISTS yt_jobs_scheduled_idx   ON yt_upload_jobs (scheduled_at);

ALTER TABLE yt_upload_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'yt_upload_jobs' AND policyname = 'admin_all_yt_jobs'
  ) THEN
    CREATE POLICY "admin_all_yt_jobs"
      ON yt_upload_jobs FOR ALL
      USING (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']))
      WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = ANY (ARRAY['admin','editor','media_manager','release_manager']));
  END IF;
END $$;
