-- Quick Thumbnail Generator support
--
-- The Thumbnail Studio modal now has two creation modes:
--   * quick_generate     — prompt-only creative thumbnails (no producer/channel/song)
--   * youtube_automation — full pipeline jobs (existing behavior)
--
-- Existing rows are backfilled to 'youtube_automation' so today's queue
-- continues to behave exactly as before. Quick-generate rows skip the
-- producer requirement.

-- 1. Allow producer-less jobs.
ALTER TABLE yt_upload_jobs
  ALTER COLUMN producer_slug DROP NOT NULL;

-- 2. Tag every job with its origin so the UI and pipeline can branch on it.
ALTER TABLE yt_upload_jobs
  ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'youtube_automation';

-- 3. Constrain to the two modes the studio supports.
ALTER TABLE yt_upload_jobs
  DROP CONSTRAINT IF EXISTS yt_upload_jobs_job_type_check;
ALTER TABLE yt_upload_jobs
  ADD CONSTRAINT yt_upload_jobs_job_type_check
  CHECK (job_type IN ('quick_generate', 'youtube_automation'));

-- 4. Index for filtered listings (quick vs automation).
CREATE INDEX IF NOT EXISTS yt_jobs_job_type_idx
  ON yt_upload_jobs (job_type, created_at DESC);
