-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A1 — Work / Recording / Version / Lineage. Additive only. `songs` and
-- `releases` are not modified; catalog_works.song_id is a nullable,
-- ON DELETE SET NULL pointer so nothing forces a backfill.
--
-- REVISED 2026-09-09 (post-production-verification pass) to the smallest
-- shape that supports ONE manually ingested real master end-to-end, per
-- docs/SUMG_NEXT_MIGRATION_DECISION.md and docs/SUMG_MANUAL_INTAKE_V1_PLAN.md.
-- Trimmed vs. the version reviewed in PR #21: catalog_recordings dropped its
-- own `title` (the work's title is sufficient until multiple recordings per
-- work is a real need) and `is_primary` (meaningless with exactly one
-- recording per work in V1). catalog_works gained `created_by`/`status`.
-- catalog_asset_versions gained `mime_type`, `duration_seconds`,
-- `review_status`, `source`, `uploaded_by`, and `technical_metadata` (jsonb —
-- same pattern as the existing, working `audio_inbox.signal_data` column,
-- reused rather than inventing new normalized columns for facts that don't
-- need to be individually indexed in V1). No backfill of any existing song —
-- this table starts empty and is populated only by the manual intake flow.
--
-- Depends on: nothing (independent of A0; other slices reference this one's
-- tables by UUID but do not require it to be applied first at the DB level
-- since all FKs here are internal to this slice).

CREATE TABLE IF NOT EXISTS catalog_works (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  song_id       TEXT        REFERENCES songs(id) ON DELETE SET NULL,
  created_by    TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'intake' CHECK (status IN ('intake', 'active', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_works_song_idx ON catalog_works (song_id);

CREATE TABLE IF NOT EXISTS catalog_recordings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id           UUID        NOT NULL REFERENCES catalog_works(id) ON DELETE CASCADE,
  -- Loose text reference, matching the existing repo convention (e.g.
  -- finance_transactions.artist_slug) of unconstrained slug references rather
  -- than a hard FK — the artist/persona may not exist as a catalog row yet at
  -- intake time. Nullable: "if known" per the V1 target (Part 8).
  artist_reference  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_recordings_work_idx ON catalog_recordings (work_id);

CREATE TABLE IF NOT EXISTS catalog_asset_versions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id        UUID        NOT NULL REFERENCES catalog_recordings(id) ON DELETE CASCADE,
  version_kind        TEXT        NOT NULL CHECK (version_kind IN
                         ('master', 'clean', 'explicit', 'instrumental', 'acapella',
                          'radio_edit', 'stem_set', 'other')),
  -- Opaque pointer into the Private Master Vault. NEVER a public URL — see
  -- lib/catalog/vault.ts. Nullable because a version row may be created before
  -- the object finishes uploading (e.g. "expected but not yet secured").
  vault_object_ref    TEXT,
  sha256              TEXT,
  size_bytes          BIGINT,
  mime_type           TEXT,
  duration_seconds    NUMERIC,
  -- Deterministic technical facts only (sample_rate, channels, bitrate_kbps,
  -- bit_depth, container) — same jsonb-bag shape as the existing, working
  -- audio_inbox.signal_data column. No AI-inferred field belongs here.
  technical_metadata  JSONB       NOT NULL DEFAULT '{}',
  -- Review Queue state (Part 13) — separate from rights status (that's A2's
  -- catalog_rights_records) and separate from routing (A3). This is purely
  -- "has a human looked at this catalog record yet."
  review_status       TEXT        NOT NULL DEFAULT 'pending_review' CHECK (review_status IN
                         ('pending_review', 'approved', 'held', 'archived', 'rejected')),
  source              TEXT        NOT NULL DEFAULT 'manual_upload',
  uploaded_by         TEXT        NOT NULL,
  is_primary          BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_recording_idx ON catalog_asset_versions (recording_id);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_sha256_idx    ON catalog_asset_versions (sha256);

CREATE TABLE IF NOT EXISTS catalog_asset_lineage (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_version_id     UUID        NOT NULL REFERENCES catalog_asset_versions(id) ON DELETE CASCADE,
  parent_asset_version_id UUID     REFERENCES catalog_asset_versions(id) ON DELETE SET NULL,
  derivation_type      TEXT        NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- No self-reference: a version cannot be its own parent.
  CONSTRAINT catalog_asset_lineage_no_self_parent
    CHECK (parent_asset_version_id IS DISTINCT FROM asset_version_id)
);
CREATE INDEX IF NOT EXISTS catalog_asset_lineage_version_idx ON catalog_asset_lineage (asset_version_id);
CREATE INDEX IF NOT EXISTS catalog_asset_lineage_parent_idx  ON catalog_asset_lineage (parent_asset_version_id);

-- Cycle prevention beyond the no-self-parent check (e.g. A -> B -> A) is
-- enforced in application code (lib/catalog/lineage.ts::addLineageEdge) at
-- write time, not via a DB constraint, since Postgres has no native DAG
-- constraint short of a recursive trigger — deferred to a future pass if the
-- table grows large enough that app-level checking becomes unreliable.

ALTER TABLE catalog_works           ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_recordings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_asset_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_asset_lineage   ENABLE ROW LEVEL SECURITY;

-- Internal catalog data = default deny. No public read policy is created for
-- any table in this slice — only CMS roles may read or write. Vault object
-- refs must never be reachable via anon/public policies. Single policy per
-- table (not the two-overlapping-policy pattern found live on several
-- existing tables in docs/SUMG_PRODUCTION_SCHEMA_DRIFT_AUDIT.md §4 — that
-- pattern is cruft from repeated migrations, not something to replicate).
CREATE POLICY "cms all catalog_works"          ON catalog_works          FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_recordings"     ON catalog_recordings     FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_asset_versions" ON catalog_asset_versions FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_asset_lineage"  ON catalog_asset_lineage  FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());

-- Reversal: DROP TABLE IF EXISTS catalog_asset_lineage, catalog_asset_versions,
-- catalog_recordings, catalog_works (in that order).
