-- Thumbnail Studio v2: prompt library management + free-create asset saving

-- ── thumbnail_prompts: add v2 management columns ─────────────────────────────
ALTER TABLE thumbnail_prompts
  ADD COLUMN IF NOT EXISTS name         text,
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS favorite     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at  timestamptz NULL,
  ADD COLUMN IF NOT EXISTS use_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz NULL;

-- Fast query index for non-archived prompts per producer
CREATE INDEX IF NOT EXISTS idx_thumbnail_prompts_library
  ON thumbnail_prompts (producer_slug, created_at DESC)
  WHERE archived_at IS NULL;

-- ── thumbnail_assets: add style_bucket + asset link + name ───────────────────
ALTER TABLE thumbnail_assets
  ADD COLUMN IF NOT EXISTS style_bucket text,
  ADD COLUMN IF NOT EXISTS asset_id     text REFERENCES assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name         text;
