-- Migration: Spotify Intelligence Layer
-- Created: 2026-04-23
-- Idempotent: all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- Safe to run against a fresh DB or an existing production DB.

-- ─── artists: Spotify identity + cached rolling stats ────────────────────────

ALTER TABLE artists ADD COLUMN IF NOT EXISTS spotify_id              TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS tags                    JSONB        NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS monthly_listeners       INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS total_streams           BIGINT       NOT NULL DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS release_count           INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS shop_url                TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS spotify_followers       INTEGER;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS spotify_popularity      INTEGER;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS spotify_last_synced_at  TIMESTAMPTZ;

-- ─── songs: Spotify track identity + audio analysis ──────────────────────────

ALTER TABLE songs ADD COLUMN IF NOT EXISTS spotify_track_id         TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS spotify_audio_features   JSONB;

-- ─── releases: accent colour + Spotify streaming metrics ─────────────────────

ALTER TABLE releases ADD COLUMN IF NOT EXISTS accent_color  TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS streams       BIGINT  NOT NULL DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS platforms     JSONB;

-- ─── artist_spotify_snapshots: point-in-time follower/popularity history ─────

CREATE TABLE IF NOT EXISTS artist_spotify_snapshots (
  id           TEXT        PRIMARY KEY,
  artist_slug  TEXT        NOT NULL,
  spotify_id   TEXT        NOT NULL,
  followers    INTEGER     NOT NULL DEFAULT 0,
  popularity   INTEGER     NOT NULL DEFAULT 0,
  genres       JSONB,
  snapshot_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE artist_spotify_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'artist_spotify_snapshots'
      AND policyname = 'public read artist snapshots'
  ) THEN
    CREATE POLICY "public read artist snapshots"
      ON artist_spotify_snapshots FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'artist_spotify_snapshots'
      AND policyname = 'cms write artist snapshots'
  ) THEN
    CREATE POLICY "cms write artist snapshots"
      ON artist_spotify_snapshots FOR ALL
      USING (is_cms_role()) WITH CHECK (is_cms_role());
  END IF;
END
$$;
