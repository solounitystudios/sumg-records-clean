-- Migration: Audio Inbox — bulk automation staging area
-- Created: 2026-05-03
-- Adds: audio_inbox table with full pipeline status tracking

CREATE TABLE IF NOT EXISTS audio_inbox (
  id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  asset_id              TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'new_asset'
                                    CHECK (status IN (
                                      'new_asset', 'analyzing', 'needs_review', 'needs_metadata',
                                      'needs_thumbnail', 'needs_render', 'ready_to_schedule',
                                      'scheduled', 'uploaded', 'failed'
                                    )),
  producer_slug         TEXT,
  variation_id          TEXT,
  dna_pack_id           TEXT,
  yt_job_id             TEXT,
  generated_title       TEXT,
  generated_description TEXT,
  generated_tags        TEXT[]      NOT NULL DEFAULT '{}',
  thumbnail_prompt      TEXT,
  override_title        TEXT,
  override_description  TEXT,
  override_tags         TEXT[]      NOT NULL DEFAULT '{}',
  error_message         TEXT,
  action_log            JSONB       NOT NULL DEFAULT '[]'::JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audio_inbox_status_idx   ON audio_inbox (status);
CREATE INDEX IF NOT EXISTS audio_inbox_asset_idx    ON audio_inbox (asset_id);
CREATE INDEX IF NOT EXISTS audio_inbox_producer_idx ON audio_inbox (producer_slug);
CREATE INDEX IF NOT EXISTS audio_inbox_created_idx  ON audio_inbox (created_at DESC);

ALTER TABLE audio_inbox ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audio_inbox' AND policyname = 'admin_all_audio_inbox'
  ) THEN
    CREATE POLICY "admin_all_audio_inbox"
      ON audio_inbox FOR ALL
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
  END IF;
END $$;
