-- Artist press/media gallery photos
-- press_photos: ordered array of public image URLs for the artist's media gallery
ALTER TABLE artists ADD COLUMN IF NOT EXISTS press_photos JSONB NOT NULL DEFAULT '[]'::JSONB;
