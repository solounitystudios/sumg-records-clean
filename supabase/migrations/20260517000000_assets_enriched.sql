-- Enrich the assets table for full asset management:
-- producer ownership, lifecycle status, freeform tags, and subcategory.

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS producer_slug TEXT,
  ADD COLUMN IF NOT EXISTS status        TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS tags          TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subcategory   TEXT;

ALTER TABLE assets
  DROP CONSTRAINT IF EXISTS assets_status_check;
ALTER TABLE assets
  ADD CONSTRAINT assets_status_check
  CHECK (status IN ('ready', 'used', 'pending', 'draft', 'archived', 'broken'));

CREATE INDEX IF NOT EXISTS assets_producer_idx ON assets (producer_slug);
CREATE INDEX IF NOT EXISTS assets_status_idx   ON assets (status);
CREATE INDEX IF NOT EXISTS assets_subcat_idx   ON assets (subcategory);
CREATE INDEX IF NOT EXISTS assets_tags_idx     ON assets USING gin (tags);
