-- Separate queue table for in-flight generation jobs (Midjourney and future providers).
-- thumbnail_assets only stores completed images with a real, permanent image_url.

CREATE TABLE IF NOT EXISTS thumbnail_generation_jobs (
  id                           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                     text         NOT NULL DEFAULT 'midjourney',
  status                       text         NOT NULL DEFAULT 'pending',
  prompt                       text         NOT NULL,
  producer_slug                text,
  upload_job_id                uuid         REFERENCES yt_upload_jobs(id) ON DELETE SET NULL,
  style_bucket                 text,
  provider_job_id              text,
  provider_raw_response        jsonb        NOT NULL DEFAULT '{}'::jsonb,
  completed_thumbnail_asset_id uuid         REFERENCES thumbnail_assets(id) ON DELETE SET NULL,
  error_message                text,
  created_at                   timestamptz  NOT NULL DEFAULT now(),
  updated_at                   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thumbnail_generation_jobs_provider_status
  ON thumbnail_generation_jobs (provider, status, created_at DESC);

ALTER TABLE thumbnail_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_thumbnail_generation_jobs"
  ON thumbnail_generation_jobs FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  );
