-- Idempotent: safe to run on dirty prod data.
-- Normalises the releases table status column to the canonical CMS set.
-- Root cause: admin UI was writing "live"; public CMS filters check "published".
-- Fix: align both to "published" as the single live/visible state.

-- Step 1: Add status column if missing
ALTER TABLE releases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE releases ALTER COLUMN status SET DEFAULT 'draft';

-- Step 2: Normalise all non-canonical status values before adding constraint
--   Nulls → draft
UPDATE releases SET status = 'draft'
 WHERE status IS NULL OR trim(status) = '';

-- "live" is the legacy admin label for a published/visible release
UPDATE releases SET status = 'published' WHERE status = 'live';

-- Any other unknown value → draft (safe fallback)
UPDATE releases
   SET status = 'draft'
 WHERE status NOT IN ('draft', 'scheduled', 'published', 'archived');

-- Step 3: Replace CHECK constraint (idempotent)
ALTER TABLE releases DROP CONSTRAINT IF EXISTS releases_status_check;
ALTER TABLE releases ADD CONSTRAINT releases_status_check
  CHECK (status IN ('draft', 'scheduled', 'published', 'archived'));

-- Step 4: Normalise songs table status in the same pass
ALTER TABLE songs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE songs ALTER COLUMN status SET DEFAULT 'draft';

UPDATE songs SET status = 'draft'
 WHERE status IS NULL OR trim(status) = '';

UPDATE songs SET status = 'published' WHERE status = 'live';

UPDATE songs
   SET status = 'draft'
 WHERE status NOT IN ('draft', 'scheduled', 'published', 'archived');

ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_status_check;
ALTER TABLE songs ADD CONSTRAINT songs_status_check
  CHECK (status IN ('draft', 'scheduled', 'published', 'archived'));
