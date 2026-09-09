-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A1 — Work / Recording / Version / Lineage. Additive only. `songs` and
-- `releases` are not modified; catalog_works.song_id is a nullable,
-- ON DELETE SET NULL pointer so nothing forces a backfill.
--
-- REVISED AGAIN 2026-09-09 (security-migration-hardening pass) after an
-- explicit field-by-field challenge — see docs/SUMG_SECURITY_MIGRATION_HARDENING.md
-- §11 for the full reasoning. Changes from the prior revision (reviewed in
-- the production-verification pass):
--
--   NEW catalog_asset_versions.upload_status column — added while working
--   through docs/SUMG_MASTER_VAULT_IMPLEMENTATION_PREFLIGHT.md's SHA-256
--   verification design (Part 19): re-verifying a hash against Supabase
--   Storage requires reading the object's bytes back, which an asynchronous
--   worker job does, not the synchronous upload request — so the schema
--   needs an explicit field for "uploaded but not yet re-verified" that
--   didn't exist in the prior revision.
--
--   created_by / uploaded_by: TEXT -> UUID REFERENCES auth.users(id).
--     Every existing "who did this" column in this schema (assets.
--     uploaded_by, admin_tasks.created_by, lyric_projects.created_by,
--     message_threads.created_by) is loose TEXT — but that is a weak legacy
--     pattern, not a reason to repeat it here. auth.users.id (confirmed
--     live: uuid, exists, and is referenced by ZERO tables anywhere in this
--     schema today) is the one genuinely stable identity primitive already
--     available on every authenticated request via the JWT `sub` claim.
--     Using it avoids storing redundant PII (email/name) across every
--     catalog table and gives a real FK guarantee instead of a hopeful
--     string match. Neither column CASCADEs on user deletion — a user being
--     removed from auth.users must never delete catalog history — but the
--     ON DELETE behavior differs because nullability differs: catalog_works.
--     created_by is nullable, so SET NULL; catalog_asset_versions.
--     uploaded_by is NOT NULL (provenance of who uploaded a master must
--     never silently disappear), so SET NULL is not legal there — RESTRICT
--     is used instead, meaning a departed user's auth row can't be deleted
--     while they still own upload provenance; reassignment, not deletion, is
--     the intended path.
--
--   catalog_recordings.artist_reference -> artist_slug (renamed only, still
--     TEXT, still no hard FK). This one stays loose deliberately — unlike
--     "who uploaded this" (a real, always-known identity), "which artist is
--     this" is a business fact that may be genuinely unknown at intake time,
--     may refer to a persona that doesn't have a catalog row yet, and
--     matches the exact loose-slug-reference pattern already used everywhere
--     else in this schema (finance_transactions.artist_slug,
--     contracts.artist_slug, documents.artist_slug — none of these are hard
--     FKs either, for the same reason). Renamed only for naming consistency
--     with that established convention. Kept in V1: the Review Queue plan
--     (docs/SUMG_MANUAL_INTAKE_V1_PLAN.md §6) needs a field to assign an
--     artist to during review, and it must be editable/nullable rather than
--     required at upload time.
--
--   song_id stays TEXT: this is not an inconsistency to fix — songs.id is
--     itself TEXT in production (confirmed live), so catalog_works.song_id
--     must match that type to FK against it. New internal-only entities
--     (catalog_works/recordings/asset_versions/lineage) correctly use UUID
--     primary keys; the one column that bridges to the legacy TEXT-id
--     `songs` table correctly uses TEXT. Two ID systems, one intentional
--     bridge column — not schema drift.
--
--   is_primary on catalog_asset_versions: kept. Directly answers "can one
--     Recording later have multiple Versions without schema regret" — yes,
--     multiple catalog_asset_versions rows can already point at one
--     recording_id; is_primary is the cheap, already-present marker for
--     "which one is current" once that happens (e.g. a remaster uploaded
--     later). Zero cost to keep now, real cost (a live ALTER TABLE on a
--     table with real data) to add later.
--
--   sha256: indexed (catalog_asset_versions_sha256_idx), NOT a UNIQUE
--     constraint. A hard uniqueness constraint would make it impossible to
--     deliberately create a second version row pointing at the same
--     underlying bytes — but docs/SUMG_MANUAL_INTAKE_V1_PLAN.md §4 explicitly
--     gives the admin a real choice on exact-duplicate detection ("link to
--     existing / upload anyway as a deliberate new version / cancel").
--     Application-level detection against the existing index, not a DB
--     constraint, is what that design requires.
--
-- Depends on: nothing (independent of A0/A0.1; A2/A5 reference this one's
-- tables by UUID but do not require it to be applied first at the DB level
-- since all FKs here are internal to this slice).

CREATE TABLE IF NOT EXISTS catalog_works (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  song_id       TEXT        REFERENCES songs(id) ON DELETE SET NULL,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status        TEXT        NOT NULL DEFAULT 'intake' CHECK (status IN ('intake', 'active', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_works_song_idx ON catalog_works (song_id);

CREATE TABLE IF NOT EXISTS catalog_recordings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id           UUID        NOT NULL REFERENCES catalog_works(id) ON DELETE CASCADE,
  -- Loose text reference, matching the existing repo-wide artist_slug
  -- convention (see header comment) — nullable, no hard FK, since the
  -- artist/persona may not exist as a catalog row yet at intake time.
  artist_slug       TEXT,
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
  -- Client-submitted hash, trusted provisionally at upload time. Whether it
  -- has actually been re-confirmed against the stored bytes is tracked
  -- separately by upload_status below — sha256 being non-null does NOT by
  -- itself mean "verified". See docs/SUMG_MASTER_VAULT_IMPLEMENTATION_PREFLIGHT.md
  -- §SHA-256 verification design for why re-verification is an asynchronous
  -- worker job, not a synchronous server step.
  size_bytes          BIGINT,
  mime_type           TEXT,
  duration_seconds    NUMERIC,
  -- Deterministic technical facts only (sample_rate, channels, bitrate_kbps,
  -- bit_depth, container) — same jsonb-bag shape as the existing, working
  -- audio_inbox.signal_data column. No AI-inferred field belongs here.
  technical_metadata  JSONB       NOT NULL DEFAULT '{}',
  -- Upload/verification pipeline state — orthogonal to review_status below
  -- (this tracks "did the bytes make it into the vault and get hash-
  -- confirmed", review_status tracks "has a human looked at it"; an item can
  -- be upload_status='verified' AND review_status='pending_review' at the
  -- same time, and normally is). Mirrors the SECURED -> VERIFIED portion of
  -- lib/catalog/intake.ts's locked IntakeStage lifecycle at the granularity
  -- this one table actually needs, rather than wiring the full 12-stage enum
  -- into a column no other part of V1 reads.
  upload_status       TEXT        NOT NULL DEFAULT 'pending_upload' CHECK (upload_status IN
                         ('pending_upload', 'uploaded_unverified', 'verified', 'failed')),
  -- Review Queue state (Part 13) — separate from rights status (that's A2's
  -- catalog_rights_records) and separate from routing (A3). This is purely
  -- "has a human looked at this catalog record yet."
  review_status       TEXT        NOT NULL DEFAULT 'pending_review' CHECK (review_status IN
                         ('pending_review', 'approved', 'held', 'archived', 'rejected')),
  source              TEXT        NOT NULL DEFAULT 'manual_upload',
  uploaded_by         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  is_primary          BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_recording_idx ON catalog_asset_versions (recording_id);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_sha256_idx    ON catalog_asset_versions (sha256);
-- Matches the existing yt_jobs_status_idx precedent (yt_upload_jobs.status) —
-- the verification worker (docs/SUMG_MASTER_VAULT_IMPLEMENTATION_PREFLIGHT.md §2)
-- polls WHERE upload_status = 'uploaded_unverified' the same way the render
-- worker polls yt_upload_jobs by status.
CREATE INDEX IF NOT EXISTS catalog_asset_versions_upload_status_idx ON catalog_asset_versions (upload_status);

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
