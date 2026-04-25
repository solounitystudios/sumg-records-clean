-- Migration: Link yt_upload_jobs to dna_packs
-- Created: 2026-04-29
-- Adds: dna_pack_id FK, nullable asset_id/yt_channel_id, needs_asset + scheduled statuses

-- ─── FK from yt_upload_jobs to dna_packs ─────────────────────────────────────

ALTER TABLE yt_upload_jobs
  ADD COLUMN IF NOT EXISTS dna_pack_id UUID REFERENCES dna_packs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS yt_jobs_dna_pack_idx ON yt_upload_jobs (dna_pack_id);

-- ─── Make asset_id and yt_channel_id nullable ─────────────────────────────────
-- Pack-sourced jobs may be created before an audio asset or channel is assigned.

ALTER TABLE yt_upload_jobs ALTER COLUMN asset_id DROP NOT NULL;
ALTER TABLE yt_upload_jobs ALTER COLUMN yt_channel_id DROP NOT NULL;

-- ─── Extend status check constraint ──────────────────────────────────────────
-- Drop whichever check constraint covers the status column, then recreate.

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
    'scheduled',
    'pending',
    'processing',
    'uploaded',
    'failed',
    'cancelled'
  ));
