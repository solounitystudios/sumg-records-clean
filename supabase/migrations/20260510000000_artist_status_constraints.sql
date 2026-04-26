-- Ensure status and featured columns exist
ALTER TABLE artists ADD COLUMN IF NOT EXISTS status   TEXT    NOT NULL DEFAULT 'active';
ALTER TABLE artists ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

-- Remap legacy 'inactive' values before adding constraint
UPDATE artists SET status = 'draft' WHERE status = 'inactive';

-- Replace any CHECK constraint with the canonical set
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_status_check;
ALTER TABLE artists ADD CONSTRAINT artists_status_check
  CHECK (status IN ('active', 'draft', 'archived'));
