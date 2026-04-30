-- Migration: Add is_default and routing_priority to producer_variations
-- Created: 2026-05-21
-- Enables the four-level variation matching strategy in matchVariation():
--   exact_match → default_variation → priority_fallback → generic_fallback

ALTER TABLE producer_variations
  ADD COLUMN IF NOT EXISTS is_default       BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS routing_priority INTEGER  NOT NULL DEFAULT 0;

-- Partial index for fast is_default lookup per producer
CREATE INDEX IF NOT EXISTS prod_variations_default_idx
  ON producer_variations (producer_slug)
  WHERE is_default = true;

-- Index for priority-ordered fallback selection
CREATE INDEX IF NOT EXISTS prod_variations_priority_idx
  ON producer_variations (producer_slug, routing_priority DESC);
