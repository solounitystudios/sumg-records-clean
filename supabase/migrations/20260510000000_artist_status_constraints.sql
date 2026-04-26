-- Idempotent: safe to run on any state of the artists table including dirty prod data.

-- Step 1: Add columns if missing (no-op when they already exist)
ALTER TABLE artists ADD COLUMN IF NOT EXISTS status   TEXT    DEFAULT 'active';
ALTER TABLE artists ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Ensure defaults are set even if column pre-existed without them
ALTER TABLE artists ALTER COLUMN status   SET DEFAULT 'active';
ALTER TABLE artists ALTER COLUMN featured SET DEFAULT false;

-- Step 2: Normalise ALL non-canonical status values before adding constraint.
--   ORDER MATTERS: specific maps first, catch-all last.

-- Null / blank → active
UPDATE artists
   SET status = 'active'
 WHERE status IS NULL
    OR trim(status) = '';

-- Known legacy renames
UPDATE artists SET status = 'draft'  WHERE status = 'inactive';
UPDATE artists SET status = 'draft'  WHERE status IN ('tester', 'demo', 'preview');
UPDATE artists SET status = 'active' WHERE status = 'live';
UPDATE artists SET status = 'active' WHERE status = 'published';

-- Anything else that is still not canonical → active (safe fallback)
UPDATE artists
   SET status = 'active'
 WHERE status NOT IN ('active', 'draft', 'archived');

-- Step 3: Replace CHECK constraint (idempotent: drop then add)
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_status_check;
ALTER TABLE artists ADD CONSTRAINT artists_status_check
  CHECK (status IN ('active', 'draft', 'archived'));
