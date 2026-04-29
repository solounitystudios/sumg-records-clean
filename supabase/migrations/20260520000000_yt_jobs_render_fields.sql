-- Add 'rendering' status (claimed by external render worker) and
-- thumbnail_asset_id / accent_color so admin can pre-configure before the
-- worker picks the job up.

-- 1. Expand status check constraint (idempotent: drop all status constraints, recreate)
DO $$
DECLARE cname TEXT;
BEGIN
FOR cname IN
  SELECT conname FROM pg_constraint
  WHERE conrelid = 'yt_upload_jobs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
LOOP
  EXECUTE 'ALTER TABLE yt_upload_jobs DROP CONSTRAINT ' || quote_ident(cname);
END LOOP;
END $$;

ALTER TABLE yt_upload_jobs ADD CONSTRAINT yt_jobs_status_check
CHECK (status IN (
  'needs_asset',
  'needs_render',
  'rendering',
  'scheduled',
  'pending',
  'processing',
  'uploaded',
  'failed',
  'cancelled'
));

-- 2. Thumbnail + accent pre-config columns
ALTER TABLE yt_upload_jobs
ADD COLUMN IF NOT EXISTS thumbnail_asset_id text REFERENCES assets(id) ON DELETE SET NULL;

ALTER TABLE yt_upload_jobs
ADD COLUMN IF NOT EXISTS accent_color text;
