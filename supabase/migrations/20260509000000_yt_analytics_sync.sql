-- PR7: Analytics sync tracking — timestamps for per-job and per-channel stat syncs

ALTER TABLE yt_channels
  ADD COLUMN stats_last_synced_at  TIMESTAMPTZ,
  ADD COLUMN stats_sync_error      TEXT;

ALTER TABLE yt_upload_jobs
  ADD COLUMN stats_last_synced_at  TIMESTAMPTZ;

COMMENT ON COLUMN yt_channels.stats_last_synced_at  IS 'When subscriber_count / monthly_views were last refreshed from YouTube Data API.';
COMMENT ON COLUMN yt_channels.stats_sync_error      IS 'Last sync error message, cleared on success.';
COMMENT ON COLUMN yt_upload_jobs.stats_last_synced_at IS 'When view_count / like_count / comment_count were last refreshed from YouTube Data API.';
