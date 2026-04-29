-- Add FK constraints for yt_upload_jobs so PostgREST relational embeds work.
-- Idempotent: safe to re-run.

-- 1. asset_id → assets.id  (renderer and processor both look up the asset)
ALTER TABLE yt_upload_jobs DROP CONSTRAINT IF EXISTS yt_upload_jobs_asset_id_fkey;
ALTER TABLE yt_upload_jobs
  ADD CONSTRAINT yt_upload_jobs_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;

-- 2. yt_channel_id → yt_channels.id  (processor embeds channel OAuth token)
ALTER TABLE yt_upload_jobs DROP CONSTRAINT IF EXISTS yt_upload_jobs_yt_channel_id_fkey;
ALTER TABLE yt_upload_jobs
  ADD CONSTRAINT yt_upload_jobs_yt_channel_id_fkey
  FOREIGN KEY (yt_channel_id) REFERENCES yt_channels(id) ON DELETE SET NULL;
