-- Add soft-delete columns to audio_inbox.
-- deleted_at IS NOT NULL means archived/deleted from the normal inbox view.
-- deleted_by stores the email of the admin who performed the action.
ALTER TABLE audio_inbox
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

-- Partial index keeps IS NULL queries fast as the table grows.
CREATE INDEX IF NOT EXISTS idx_audio_inbox_deleted_at_null
  ON audio_inbox (created_at DESC)
  WHERE deleted_at IS NULL;
