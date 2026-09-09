-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A1 — Work / Recording / Version / Lineage. Additive only. `songs` and
-- `releases` are not modified; catalog_works.song_id is a nullable,
-- ON DELETE SET NULL pointer so nothing forces a backfill.
--
-- Depends on: nothing (independent of A0; other slices reference this one's
-- tables by UUID but do not require it to be applied first at the DB level
-- since all FKs here are internal to this slice).

CREATE TABLE IF NOT EXISTS catalog_works (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  song_id       TEXT        REFERENCES songs(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_works_song_idx ON catalog_works (song_id);

CREATE TABLE IF NOT EXISTS catalog_recordings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id       UUID        NOT NULL REFERENCES catalog_works(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  is_primary    BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_recordings_work_idx ON catalog_recordings (work_id);

CREATE TABLE IF NOT EXISTS catalog_asset_versions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id      UUID        NOT NULL REFERENCES catalog_recordings(id) ON DELETE CASCADE,
  version_kind      TEXT        NOT NULL CHECK (version_kind IN
                       ('master', 'clean', 'explicit', 'instrumental', 'acapella',
                        'radio_edit', 'stem_set', 'other')),
  -- Opaque pointer into the Private Master Vault. NEVER a public URL — see
  -- lib/catalog/vault.ts. Nullable because a version row may be created before
  -- the object finishes uploading (e.g. "expected but not yet secured").
  vault_object_ref  TEXT,
  sha256            TEXT,
  size_bytes        BIGINT,
  is_primary        BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
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
-- enforced in application code (lib/catalog/lineage.ts::assertNoCycle) at
-- write time, not via a DB constraint, since Postgres has no native DAG
-- constraint short of a recursive trigger — deferred to a future pass if the
-- table grows large enough that app-level checking becomes unreliable.

ALTER TABLE catalog_works           ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_recordings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_asset_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_asset_lineage   ENABLE ROW LEVEL SECURITY;

-- Internal catalog data = default deny. No public read policy is created for
-- any table in this slice — only CMS roles may read or write. Vault object
-- refs must never be reachable via anon/public policies.
CREATE POLICY "cms all catalog_works"          ON catalog_works          FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_recordings"     ON catalog_recordings     FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_asset_versions" ON catalog_asset_versions FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_asset_lineage"  ON catalog_asset_lineage  FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());

-- Reversal: DROP TABLE IF EXISTS catalog_asset_lineage, catalog_asset_versions,
-- catalog_recordings, catalog_works (in that order).
