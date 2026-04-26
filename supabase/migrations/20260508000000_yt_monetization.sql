-- PR6: Monetization layer — RPM, revenue projections, sponsor readiness, channel valuation

ALTER TABLE yt_channels
  ADD COLUMN monetization_enabled  BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN avg_rpm               NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN avg_views_per_upload  INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN subscriber_count      INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN monthly_views         INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN content_niche         TEXT,
  ADD COLUMN sponsor_tier          TEXT         NOT NULL DEFAULT 'none'
    CHECK (sponsor_tier IN ('none', 'micro', 'mid', 'macro', 'elite'));

COMMENT ON COLUMN yt_channels.avg_rpm               IS 'Average revenue per mille ($ per 1 000 views).';
COMMENT ON COLUMN yt_channels.avg_views_per_upload  IS 'Historical average view count per uploaded video.';
COMMENT ON COLUMN yt_channels.subscriber_count      IS 'Subscriber count (synced from YT API or manual).';
COMMENT ON COLUMN yt_channels.monthly_views         IS 'Total views in the last 30 days.';
COMMENT ON COLUMN yt_channels.content_niche         IS 'Primary content niche (e.g. lo-fi, hip-hop, ambient).';
COMMENT ON COLUMN yt_channels.sponsor_tier          IS 'Sponsor readiness tier: none → micro → mid → macro → elite.';

ALTER TABLE yt_upload_jobs
  ADD COLUMN view_count            INTEGER,
  ADD COLUMN like_count            INTEGER,
  ADD COLUMN comment_count         INTEGER,
  ADD COLUMN estimated_revenue_usd NUMERIC(10,4);

COMMENT ON COLUMN yt_upload_jobs.view_count            IS 'View count synced from YouTube Analytics.';
COMMENT ON COLUMN yt_upload_jobs.estimated_revenue_usd IS 'Estimated ad revenue: view_count × channel.avg_rpm / 1000.';
