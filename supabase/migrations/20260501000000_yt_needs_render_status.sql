-- Migration: Add needs_render status to yt_upload_jobs
-- Created: 2026-05-01
-- needs_render = audio asset assigned but video not yet rendered

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
    'scheduled',
    'pending',
    'processing',
    'uploaded',
    'failed',
    'cancelled'
  ));
