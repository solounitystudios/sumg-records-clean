-- Keep one audio_inbox row per source asset and backfill producer ownership.

UPDATE audio_inbox ai
SET producer_slug = a.producer_slug,
    updated_at    = NOW()
FROM assets a
WHERE ai.asset_id = a.id
  AND ai.producer_slug IS NULL
  AND a.producer_slug IS NOT NULL;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY asset_id
      ORDER BY
        CASE WHEN yt_job_id IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN dna_pack_id IS NOT NULL THEN 0 ELSE 1 END,
        CASE
          WHEN status = 'uploaded' THEN 0
          WHEN status = 'scheduled' THEN 1
          WHEN status = 'ready_to_schedule' THEN 2
          WHEN status = 'needs_render' THEN 3
          WHEN status = 'needs_thumbnail' THEN 4
          WHEN status = 'needs_metadata' THEN 5
          WHEN status = 'needs_review' THEN 6
          WHEN status = 'analyzing' THEN 7
          WHEN status = 'new_asset' THEN 8
          ELSE 9
        END,
        created_at ASC,
        id ASC
    ) AS rn
  FROM audio_inbox
)
DELETE FROM audio_inbox ai
USING ranked r
WHERE ai.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS audio_inbox_asset_unique_idx ON audio_inbox (asset_id);
