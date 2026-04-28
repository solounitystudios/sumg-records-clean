-- Idempotent FK: audio_inbox.asset_id → assets.id
-- Prior migration 20260514 likely failed because assets was created outside
-- the migration chain. Delete orphaned rows first, then add constraint safely.

DELETE FROM audio_inbox
WHERE asset_id NOT IN (SELECT id FROM assets);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'audio_inbox_asset_id_fkey'
      AND table_name      = 'audio_inbox'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE audio_inbox
      ADD CONSTRAINT audio_inbox_asset_id_fkey
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;
  END IF;
END $$;
