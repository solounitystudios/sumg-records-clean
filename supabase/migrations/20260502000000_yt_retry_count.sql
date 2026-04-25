-- Migration: Add retry_count to yt_upload_jobs + last_scheduled_at to yt_channels
-- Created: 2026-05-02

-- Tracks how many times a job has been retried to prevent infinite retry loops.
ALTER TABLE yt_upload_jobs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- Tracks when we last auto-scheduled for this channel (for diagnostics).
ALTER TABLE yt_channels
  ADD COLUMN IF NOT EXISTS last_scheduled_at TIMESTAMPTZ;

-- Index to efficiently find retryable failed jobs (retry_count < limit).
CREATE INDEX IF NOT EXISTS yt_jobs_retry_idx ON yt_upload_jobs (status, retry_count)
  WHERE status = 'failed';
