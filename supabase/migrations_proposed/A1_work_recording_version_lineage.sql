-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A1 — Work / Recording / Version / Lineage. Additive only. `songs` and
-- `releases` are not modified; catalog_works.song_id is a nullable,
-- ON DELETE SET NULL pointer so nothing forces a backfill.
--
-- REVISED AGAIN 2026-09-09 (pre-production hardening pass) after an
-- adversarial review — see docs/SUMG_CATALOG_PRE_PRODUCTION_HARDENING.md and
-- docs/SUMG_MANUAL_INTAKE_STATE_MACHINE.md for the full reasoning. Summary of
-- changes from the prior revision:
--
-- ARCHITECTURAL NOTE — NO TENANCY MODEL: this pass's brief assumed a
-- multi-tenant "owner_user_id" / cross-owner-isolation model. That does not
-- match this product: SUMG Records is a single label with one shared
-- CMS-role-gated catalog (every existing table in this schema is gated by
-- is_cms_role(), never by row-level ownership — confirmed across all 53
-- production tables). created_by/uploaded_by are PROVENANCE (who did this),
-- not an access-control boundary. There is no "cross-owner" RLS case to
-- design for here, because there is no owner boundary to cross. This is
-- called out explicitly rather than force-fitting a tenancy model the
-- product doesn't have.
--
--   sha256 -> client_sha256 + verified_sha256 (two columns, not one mutable
--     field). client_sha256 is advisory, submitted by the browser before
--     verification; verified_sha256 is authoritative, set ONLY by the
--     verification worker after re-hashing the stored object. Duplicate
--     detection uses verified_sha256; client_sha256 only powers an early,
--     non-authoritative "might be a duplicate" hint before verification
--     completes. See the manual intake state machine doc §SHA-256 contract.
--
--   upload_status: 4 states -> 6, redesigned as the smallest machine that
--     still handles real failures (candidates explicitly rejected, with
--     reasons, in the state machine doc): 'draft' rejected (nothing is
--     created before upload intent exists); 'uploading' rejected (the
--     server never observes this moment — upload is direct client-to-
--     storage — so persisting it would require a needless mid-upload
--     ping with no reader); 'stale'/'quarantined' rejected as persisted
--     states (staleness is a reconciliation-report/derived condition from
--     updated_at, not a stored state; quarantine-equivalent urgency is
--     covered by catalog_review_flags.severity='critical' instead of a
--     second overlapping state). Kept/added: pending_upload,
--     uploaded_unverified, verifying (new — a worker has claimed it),
--     verified, verification_failed (renamed from 'failed' for clarity
--     against upload-transport failure, which never gets its own DB state
--     — see below), cancelled (new — explicit terminal user action).
--
--   idempotency_key (new, nullable) + UNIQUE (uploaded_by, idempotency_key):
--     the DB-enforced half of the idempotent-intake contract — see the
--     state machine doc's idempotency contract. Nullable because
--     worker-created derivative versions (lineage children) don't go
--     through the client upload path and have no client-generated key;
--     Postgres's default NULL handling in UNIQUE constraints (multiple
--     NULLs never collide) makes this the correct, unforced behavior.
--
--   one-primary-per-recording now DB-enforced (partial unique index),
--     closing a gap the prior revision left to app-code discipline alone.
--
--   catalog_recordings.work_id and catalog_asset_versions.recording_id are
--     now immutable after creation (BEFORE UPDATE triggers) — a graph
--     integrity protection Part 10 of the hardening brief asked for
--     ("prefer composite FK enforcement... do not rely only on app
--     queries"), even though there's no tenancy boundary at stake — this
--     closes "asset silently reassigned to an unrelated Work" as a
--     structural impossibility rather than an app-code convention.
--
--   NEW catalog_verification_jobs table (Part 6 — Option B chosen: a
--     separate table, not claim columns on catalog_asset_versions, so
--     worker plumbing doesn't overload the catalog-facing entity). Claim
--     primitive documented in the table's own comment.
--
--   NEW catalog_review_flags table (Part 16 — smallest safe model: not a
--     full generic review-queue-with-priority-assignment system,
--     review_status already covers single-state review tracking; this
--     table exists because MULTIPLE independent reasons can flag the same
--     asset version simultaneously, e.g. rights_unknown AND duplicate_hash
--     at once, which a single enum column cannot represent).
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
  -- convention — nullable, no hard FK, since the artist/persona may not
  -- exist as a catalog row yet at intake time.
  artist_slug       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_recordings_work_idx ON catalog_recordings (work_id);

-- work_id is immutable after creation — a Recording cannot be silently
-- reassigned to a different Work. Closes Part 10's "asset linked to
-- unrelated Work" concern structurally.
CREATE OR REPLACE FUNCTION catalog_recordings_work_id_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.work_id IS DISTINCT FROM OLD.work_id THEN
    RAISE EXCEPTION 'catalog_recordings.work_id is immutable (recording %, old work %, attempted new work %)', OLD.id, OLD.work_id, NEW.work_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER catalog_recordings_work_id_immutable_trg
  BEFORE UPDATE ON catalog_recordings
  FOR EACH ROW EXECUTE FUNCTION catalog_recordings_work_id_immutable();

CREATE TABLE IF NOT EXISTS catalog_asset_versions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id        UUID        NOT NULL REFERENCES catalog_recordings(id) ON DELETE CASCADE,
  version_kind        TEXT        NOT NULL CHECK (version_kind IN
                         ('master', 'clean', 'explicit', 'instrumental', 'acapella',
                          'radio_edit', 'stem_set', 'other')),
  -- Opaque pointer into the Private Master Vault, derived entirely from
  -- server-generated UUIDs (work_id/recording_id/asset_version_id) — never
  -- from user-supplied text (title, filename). NEVER a public URL. See
  -- lib/catalog/vault.ts and docs/SUMG_MASTER_VAULT_SECURITY_CONTRACT.md.
  -- Nullable because a version row is created before the object finishes
  -- uploading — see the idempotent-intake contract below.
  vault_object_ref    TEXT,
  -- Advisory only, submitted by the client before verification. Never
  -- trusted alone for duplicate detection or as proof of content identity.
  client_sha256       TEXT,
  -- Authoritative. NULL until the verification worker re-hashes the stored
  -- object and confirms it. This is the column duplicate detection and any
  -- "is this really what it claims to be" decision must use.
  verified_sha256     TEXT,
  size_bytes          BIGINT,
  mime_type           TEXT,
  duration_seconds    NUMERIC,
  -- Deterministic technical facts only (sample_rate, channels, bitrate_kbps,
  -- bit_depth, container) — same jsonb-bag shape as the existing, working
  -- audio_inbox.signal_data column. No AI-inferred field belongs here.
  technical_metadata  JSONB       NOT NULL DEFAULT '{}',
  -- Upload/verification pipeline state — orthogonal to review_status below.
  -- See docs/SUMG_MANUAL_INTAKE_STATE_MACHINE.md for the full transition
  -- matrix and the reasoning for exactly these six states (and not more).
  upload_status       TEXT        NOT NULL DEFAULT 'pending_upload' CHECK (upload_status IN
                         ('pending_upload', 'uploaded_unverified', 'verifying',
                          'verified', 'verification_failed', 'cancelled')),
  -- Review Queue state — separate from rights status (A2's
  -- catalog_rights_records) and separate from routing (A3). Purely "has a
  -- human looked at this catalog record yet."
  review_status       TEXT        NOT NULL DEFAULT 'pending_review' CHECK (review_status IN
                         ('pending_review', 'approved', 'held', 'archived', 'rejected')),
  source              TEXT        NOT NULL DEFAULT 'manual_upload',
  uploaded_by         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  is_primary          BOOLEAN     NOT NULL DEFAULT false,
  -- Client-generated, persisted through retries. NULL for rows created by a
  -- non-client path (e.g. a worker-created lineage derivative). See the
  -- idempotency contract in the state machine doc.
  idempotency_key     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- NULL idempotency_key values never collide under a UNIQUE constraint
  -- (Postgres default), so this only actually constrains genuine client
  -- upload attempts, exactly as intended.
  UNIQUE (uploaded_by, idempotency_key)
);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_recording_idx    ON catalog_asset_versions (recording_id);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_client_sha_idx   ON catalog_asset_versions (client_sha256);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_verified_sha_idx ON catalog_asset_versions (verified_sha256);
-- Matches the existing yt_jobs_status_idx precedent (yt_upload_jobs.status).
CREATE INDEX IF NOT EXISTS catalog_asset_versions_upload_status_idx ON catalog_asset_versions (upload_status);
-- At most one primary version per recording — DB-enforced, not app-code
-- discipline. Closes Part 10's "duplicate primary recordings/versions"
-- concern structurally.
CREATE UNIQUE INDEX IF NOT EXISTS catalog_asset_versions_one_primary_per_recording
  ON catalog_asset_versions (recording_id) WHERE is_primary;

-- recording_id is immutable after creation, same rationale as
-- catalog_recordings.work_id above.
CREATE OR REPLACE FUNCTION catalog_asset_versions_recording_id_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.recording_id IS DISTINCT FROM OLD.recording_id THEN
    RAISE EXCEPTION 'catalog_asset_versions.recording_id is immutable (asset_version %, old recording %, attempted new recording %)', OLD.id, OLD.recording_id, NEW.recording_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER catalog_asset_versions_recording_id_immutable_trg
  BEFORE UPDATE ON catalog_asset_versions
  FOR EACH ROW EXECUTE FUNCTION catalog_asset_versions_recording_id_immutable();

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
-- At most one lineage edge per child version — a version has exactly zero
-- or one parent, never two derivation origins. Closes an unstated ambiguity
-- from the prior revision (nothing prevented two rows both claiming
-- asset_version_id = X with different parents).
CREATE UNIQUE INDEX IF NOT EXISTS catalog_asset_lineage_one_parent_per_version
  ON catalog_asset_lineage (asset_version_id);

-- Multi-hop cycle prevention (A -> B -> A, or longer) beyond the no-self-
-- parent check is enforced in application code
-- (lib/catalog/lineage.ts::addLineageEdge) at write time, not via a DB
-- constraint — Postgres has no native DAG constraint short of a recursive
-- trigger walking the whole ancestor chain on every insert. Deferred to a
-- future pass if the table grows large enough that app-level checking
-- becomes unreliable; see docs/SUMG_CATALOG_PRE_PRODUCTION_HARDENING.md's
-- graph integrity section for the full risk assessment (classified LOW at
-- V1 scale: lineage is only ever written by the verification worker /
-- admin actions going through lib/catalog/lineage.ts, never raw SQL).

-- ============================================================================
-- catalog_verification_jobs — worker claim/lease bookkeeping, separated from
-- the catalog-facing catalog_asset_versions table (Part 6, Option B).
-- ============================================================================
-- Claim primitive (documented for the future worker implementation, not
-- applied as a stored procedure this pass):
--
--   UPDATE catalog_verification_jobs
--   SET status = 'claimed', claimed_by = $worker_id, claimed_at = now(),
--       lease_expires_at = now() + interval '5 minutes',
--       attempt_count = attempt_count + 1, last_attempt_at = now()
--   WHERE id = (
--     SELECT id FROM catalog_verification_jobs
--     WHERE (status = 'pending' OR (status = 'claimed' AND lease_expires_at < now()))
--       AND (next_attempt_at IS NULL OR next_attempt_at <= now())
--       AND attempt_count < 5
--     ORDER BY next_attempt_at NULLS FIRST, created_at
--     LIMIT 1
--     FOR UPDATE SKIP LOCKED
--   )
--   RETURNING *;
--
-- FOR UPDATE SKIP LOCKED is the Postgres-native safe concurrent-claim
-- primitive: a second worker's identical query simply skips a row already
-- locked by another transaction's claim, rather than blocking or double-
-- claiming. Completion must be guarded by claimed_by to prevent a
-- lease-expired worker's stale completion from overwriting a subsequent
-- claimant's progress ("lease theft" — see the state machine doc's worker
-- contract for the full race-condition proofs):
--
--   UPDATE catalog_verification_jobs
--   SET status = 'completed', completed_at = now()
--   WHERE id = $1 AND status = 'claimed' AND claimed_by = $worker_id;
--   -- if this affects 0 rows, the caller lost its lease — must NOT assume
--   -- success, must log and stop, not retry the completion.
CREATE TABLE IF NOT EXISTS catalog_verification_jobs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_version_id  UUID        NOT NULL UNIQUE REFERENCES catalog_asset_versions(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN
                       ('pending', 'claimed', 'completed', 'failed')),
  -- Worker instance identity, not a human — free text (e.g. hostname:pid or
  -- a worker-generated UUID), never a foreign key to auth.users.
  claimed_by        TEXT,
  claimed_at        TIMESTAMPTZ,
  lease_expires_at  TIMESTAMPTZ,
  attempt_count     INTEGER     NOT NULL DEFAULT 0,
  last_attempt_at   TIMESTAMPTZ,
  last_error_code   TEXT,
  last_error_detail TEXT,
  next_attempt_at   TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_verification_jobs_claim_idx
  ON catalog_verification_jobs (status, next_attempt_at);

-- ============================================================================
-- catalog_review_flags — multiple independent human-review reasons per
-- subject, current-state model (mutable, resolved in place; resolution
-- HISTORY lives in A5's catalog_audit_log, not duplicated here — Part 16).
-- ============================================================================
CREATE TABLE IF NOT EXISTS catalog_review_flags (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type  TEXT        NOT NULL CHECK (subject_type IN ('work', 'recording', 'asset_version')),
  subject_id    UUID        NOT NULL,
  reason_code   TEXT        NOT NULL CHECK (reason_code IN
                   ('rights_unknown', 'duplicate_hash', 'metadata_missing',
                    'verification_failed', 'unsupported_format', 'duration_invalid',
                    'hash_mismatch', 'lineage_conflict', 'quarantine_required')),
  severity      TEXT        NOT NULL CHECK (severity IN ('info', 'review', 'blocked', 'critical')),
  status        TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  detail        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution    TEXT,
  CHECK ((status = 'resolved') = (resolved_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS catalog_review_flags_subject_idx ON catalog_review_flags (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS catalog_review_flags_open_idx    ON catalog_review_flags (status) WHERE status = 'open';

ALTER TABLE catalog_works                ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_recordings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_asset_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_asset_lineage        ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_verification_jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_review_flags         ENABLE ROW LEVEL SECURITY;

-- Internal catalog data = default deny. No public read policy is created for
-- any table in this slice — only CMS roles may read or write. Vault object
-- refs must never be reachable via anon/public policies. Single policy per
-- table (not the two-overlapping-policy pattern found live on several
-- existing tables in docs/SUMG_PRODUCTION_SCHEMA_DRIFT_AUDIT.md §4 — that
-- pattern is cruft from repeated migrations, not something to replicate).
-- catalog_verification_jobs is written by the worker via the service-role
-- client (which bypasses RLS regardless) — its CMS policy exists so an
-- admin can read job status directly for debugging, not because any
-- CMS-role user writes to it in the normal flow.
CREATE POLICY "cms all catalog_works"             ON catalog_works             FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_recordings"        ON catalog_recordings        FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_asset_versions"    ON catalog_asset_versions    FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_asset_lineage"     ON catalog_asset_lineage     FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_verification_jobs" ON catalog_verification_jobs FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_review_flags"      ON catalog_review_flags      FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());

-- Reversal: DROP TABLE IF EXISTS catalog_review_flags, catalog_verification_jobs,
-- catalog_asset_lineage, catalog_asset_versions, catalog_recordings, catalog_works
-- (in that order); DROP FUNCTION catalog_recordings_work_id_immutable,
-- catalog_asset_versions_recording_id_immutable (CASCADE drops their triggers
-- automatically when the owning table is dropped, so explicit trigger drops
-- are only needed if dropping the functions without dropping the tables).
