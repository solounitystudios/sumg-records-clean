-- Midjourney dual-engine: provider tracking on thumbnail_assets
--
-- Apply this in the Supabase SQL editor or via `supabase db push`.

ALTER TABLE thumbnail_assets
  ADD COLUMN IF NOT EXISTS provider              text  NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_job_id       text,
  ADD COLUMN IF NOT EXISTS provider_status       text  NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS provider_prompt       text,
  ADD COLUMN IF NOT EXISTS provider_raw_response jsonb DEFAULT '{}';

-- Existing rows are backfilled automatically:
--   provider='manual', provider_status='complete'

-- Index for queue page: all midjourney rows by status then date
CREATE INDEX IF NOT EXISTS idx_thumbnail_assets_provider_status
  ON thumbnail_assets (provider, provider_status, created_at DESC);
