-- Migration: Apple Music Integration
-- Created: 2026-04-24
-- Idempotent: all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ─── artists: Apple Music identity ───────────────────────────────────────────

ALTER TABLE artists ADD COLUMN IF NOT EXISTS apple_music_id   TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS apple_music_url  TEXT;

-- ─── releases: Apple Music album identity ────────────────────────────────────

ALTER TABLE releases ADD COLUMN IF NOT EXISTS apple_album_id  TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS apple_url       TEXT;

-- ─── songs: Apple Music song identity ────────────────────────────────────────

ALTER TABLE songs ADD COLUMN IF NOT EXISTS apple_song_id      TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS apple_url          TEXT;

-- ─── apple_metrics_daily: point-in-time play/listener metrics ────────────────

CREATE TABLE IF NOT EXISTS apple_metrics_daily (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type   TEXT        NOT NULL CHECK (entity_type IN ('artist', 'release', 'song')),
  entity_slug   TEXT        NOT NULL,
  apple_id      TEXT        NOT NULL,
  metric_date   DATE        NOT NULL,
  plays         INTEGER     NOT NULL DEFAULT 0,
  listeners     INTEGER     NOT NULL DEFAULT 0,
  shazams       INTEGER     NOT NULL DEFAULT 0,
  storefront    TEXT        NOT NULL DEFAULT 'us',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_slug, metric_date, storefront)
);

CREATE INDEX IF NOT EXISTS apple_metrics_entity_date
  ON apple_metrics_daily (entity_slug, metric_date DESC);

ALTER TABLE apple_metrics_daily ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'apple_metrics_daily'
      AND policyname = 'public read apple metrics'
  ) THEN
    CREATE POLICY "public read apple metrics"
      ON apple_metrics_daily FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'apple_metrics_daily'
      AND policyname = 'cms write apple metrics'
  ) THEN
    CREATE POLICY "cms write apple metrics"
      ON apple_metrics_daily FOR ALL
      USING (is_cms_role()) WITH CHECK (is_cms_role());
  END IF;
END
$$;
