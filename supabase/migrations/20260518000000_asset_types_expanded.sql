-- Expand asset type set to include design files (PSD, AI, EPS, SVG) and archives (ZIP).
-- Drop and recreate type check constraint; additive-only for existing data.

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_type_check;
ALTER TABLE assets
  ADD CONSTRAINT assets_type_check
  CHECK (type IN ('image', 'video', 'audio', 'document', 'design', 'archive'));
