-- Add foreign key constraints from asset_id columns to assets.id.
-- assets.id is TEXT (not UUID), so no type cast is required.

-- audio_inbox: cascade delete when asset is removed
ALTER TABLE audio_inbox
  ADD CONSTRAINT audio_inbox_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;

-- yt_upload_jobs: null out when asset is removed
ALTER TABLE yt_upload_jobs
  ALTER COLUMN asset_id DROP NOT NULL;
ALTER TABLE yt_upload_jobs
  ADD CONSTRAINT yt_upload_jobs_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;

-- dna_packs: already nullable, null out when asset is removed
ALTER TABLE dna_packs
  ADD CONSTRAINT dna_packs_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;
