-- Fix 1: Postgres function for atomic JSONB log append (eliminates N+1 read-modify-write)
CREATE OR REPLACE FUNCTION append_inbox_log(p_id TEXT, p_entry JSONB)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE audio_inbox
  SET action_log = action_log || jsonb_build_array(p_entry),
      updated_at = now()
  WHERE id = p_id::uuid;
$$;

-- Fix 2: Convert variation_id, dna_pack_id, yt_job_id from TEXT to UUID with FK constraints
-- Safety: NULL out any empty-string values that would fail the cast
UPDATE audio_inbox SET variation_id = NULL WHERE variation_id = '';
UPDATE audio_inbox SET dna_pack_id  = NULL WHERE dna_pack_id  = '';
UPDATE audio_inbox SET yt_job_id    = NULL WHERE yt_job_id    = '';

ALTER TABLE audio_inbox
  ALTER COLUMN variation_id TYPE uuid USING variation_id::uuid,
  ALTER COLUMN dna_pack_id  TYPE uuid USING dna_pack_id::uuid,
  ALTER COLUMN yt_job_id    TYPE uuid USING yt_job_id::uuid;

ALTER TABLE audio_inbox
  ADD CONSTRAINT audio_inbox_variation_id_fkey
    FOREIGN KEY (variation_id) REFERENCES producer_variations(id) ON DELETE SET NULL,
  ADD CONSTRAINT audio_inbox_dna_pack_id_fkey
    FOREIGN KEY (dna_pack_id) REFERENCES dna_packs(id) ON DELETE SET NULL,
  ADD CONSTRAINT audio_inbox_yt_job_id_fkey
    FOREIGN KEY (yt_job_id) REFERENCES yt_upload_jobs(id) ON DELETE SET NULL;
