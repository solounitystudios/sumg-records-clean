-- SUMG-CAT-P0-003 (part 1 of 2) — A1: Work / Recording / Asset Version /
-- Lineage / Verification / Review.
--
-- Promoted from supabase/migrations_proposed/A1_work_recording_version_lineage.sql
-- after the P0-003 production-readiness audit (docs/SUMG_CAT_P0_003_MASTERVAULT_A1.md).
-- This is NOT a verbatim copy of the proposal — the audit found six narrow
-- defects; every one is fixed here and called out inline with an
-- "[P0-003 FIX]" tag. The proposal file stays untouched as the historical
-- design record.
--
-- Additive only. `songs` and `releases` are NOT modified, NOT read, NOT
-- backfilled. catalog_works.song_id is a nullable ON DELETE SET NULL pointer
-- so nothing forces a backfill of the existing 32 songs / 32 releases.
--
-- Depends on: 20260909100001_catalog_audit_log.sql (A5) — the two audit
-- triggers added by this migration (see "[P0-003 FIX] #6") INSERT into
-- catalog_audit_log. The DDL here succeeds without A5, but an INSERT into
-- catalog_asset_versions / catalog_asset_lineage would fail at runtime with
-- "relation catalog_audit_log does not exist" until A5 is applied. A5 is
-- already applied in production (ledger 20260909153314), so this is satisfied.
--
-- Does NOT include: A3, A4, routing, destinations, PersonaWorks, apparel /
-- business-unit schema, contributor convergence, DSP delivery. The Master
-- Vault Storage bucket is a SEPARATE migration
-- (20260909180100_catalog_master_vault_storage.sql) applied alongside this one.
--
-- ARCHITECTURAL NOTE — NO TENANCY MODEL (unchanged from the proposal): SUMG
-- Records is a single label with one shared is_cms_role()-gated catalog.
-- created_by / uploaded_by are PROVENANCE (who did this), never an
-- access-control boundary. There is no cross-owner RLS case here.

-- ============================================================================
-- Shared helper — keep updated_at honest (reconciliation in
-- docs/SUMG_MASTER_VAULT_SECURITY_CONTRACT.md §2 detects stale uploads via
-- `updated_at < now() - interval`, so updated_at must not rely on every
-- caller remembering to set it). [P0-003 FIX] #5.
-- ============================================================================
CREATE OR REPLACE FUNCTION catalog_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- catalog_works — the composition / work. One row per distinct work; a work
-- may (later, optionally) point at an existing songs row, but never requires
-- one.
-- ============================================================================
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
CREATE TRIGGER catalog_works_touch_updated_at_trg
  BEFORE UPDATE ON catalog_works
  FOR EACH ROW EXECUTE FUNCTION catalog_touch_updated_at();

-- ============================================================================
-- catalog_recordings — the specific recording of a work. work_id is immutable
-- after creation (a recording cannot be silently reassigned to a different
-- work — Part 10 graph integrity).
-- ============================================================================
CREATE TABLE IF NOT EXISTS catalog_recordings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id           UUID        NOT NULL REFERENCES catalog_works(id) ON DELETE CASCADE,
  -- Loose text reference, matching the repo-wide artist_slug convention —
  -- nullable, no hard FK, since the artist/persona may not exist as a
  -- catalog row yet at intake time.
  artist_slug       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_recordings_work_idx ON catalog_recordings (work_id);

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

-- ============================================================================
-- catalog_asset_versions — the uploaded master file / version. Owns the
-- Private Master Vault reference (vault_object_ref). recording_id is immutable
-- after creation.
-- ============================================================================
CREATE TABLE IF NOT EXISTS catalog_asset_versions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id        UUID        NOT NULL REFERENCES catalog_recordings(id) ON DELETE CASCADE,
  version_kind        TEXT        NOT NULL CHECK (version_kind IN
                         ('master', 'clean', 'explicit', 'instrumental', 'acapella',
                          'radio_edit', 'stem_set', 'other')),
  -- Opaque pointer into the Private Master Vault (bucket sumg-master-vault),
  -- built ENTIRELY from server-generated UUIDs — never from user-supplied
  -- text. NEVER a public URL. Canonical shape:
  --   masters/<recording_id>/<asset_version_id>/original.<ext>
  -- [P0-003 FIX] #3 — the proposal left this as a free TEXT column; a row
  -- could point vault_object_ref at ANOTHER version's stored object. This
  -- CHECK binds the ref to THIS row's own recording_id + id, so a version
  -- can only ever reference its own canonical object key. <ext> is one of
  -- the audio master extensions from the Storage MIME allowlist. NULL until
  -- the upload is prepared (the row is created first — see the intake
  -- transaction model in docs/SUMG_MANUAL_INTAKE_STATE_MACHINE.md).
  vault_object_ref    TEXT,
  -- Advisory only, submitted by the client before verification. Never trusted
  -- alone for duplicate detection or as proof of content identity.
  client_sha256       TEXT,
  -- Authoritative. NULL until the stored object has been re-hashed
  -- (server-side, by the verification step / worker). This is the column
  -- duplicate detection and any content-identity decision must use.
  verified_sha256     TEXT,
  size_bytes          BIGINT,
  mime_type           TEXT,
  duration_seconds    NUMERIC,
  -- Deterministic technical facts only (sample_rate, channels, bitrate_kbps,
  -- bit_depth, container). No AI-inferred field belongs here.
  technical_metadata  JSONB       NOT NULL DEFAULT '{}',
  upload_status       TEXT        NOT NULL DEFAULT 'pending_upload' CHECK (upload_status IN
                         ('pending_upload', 'uploaded_unverified', 'verifying',
                          'verified', 'verification_failed', 'cancelled')),
  review_status       TEXT        NOT NULL DEFAULT 'pending_review' CHECK (review_status IN
                         ('pending_review', 'approved', 'held', 'archived', 'rejected')),
  -- [P0-003 FIX] #2 — the proposal left `source` as free TEXT. Constrained
  -- to the small set of real intake origins so a typo or an invented origin
  -- can't slip into the chain of custody.
  source              TEXT        NOT NULL DEFAULT 'manual_upload' CHECK (source IN
                         ('manual_upload', 'worker_derivative', 'system_import', 'api_upload')),
  -- [P0-003 FIX] #1 — the proposal had `uploaded_by UUID NOT NULL ...
  -- ON DELETE RESTRICT`, which (a) blocks deleting an auth.users row that
  -- ever uploaded anything and (b) contradicts A5's / A2's own
  -- "provenance survives user deletion" model (both use nullable +
  -- ON DELETE SET NULL). The immutable catalog_audit_log 'intake_created'
  -- event (below) is the durable chain-of-custody record; this column is
  -- the live pointer and is allowed to go NULL if the user is later deleted.
  uploaded_by         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_primary          BOOLEAN     NOT NULL DEFAULT false,
  -- Client-generated, persisted through retries. NULL for non-client paths
  -- (e.g. a worker-created lineage derivative).
  idempotency_key     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- NULL idempotency_key values never collide under UNIQUE (Postgres
  -- default), so this only constrains genuine client upload attempts.
  UNIQUE (uploaded_by, idempotency_key),
  CONSTRAINT catalog_asset_versions_vault_ref_shape CHECK (
    vault_object_ref IS NULL
    OR vault_object_ref ~ ('^masters/' || recording_id::text || '/' || id::text || '/original\.(wav|flac|aiff|aif|mp3)$')
  )
);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_recording_idx    ON catalog_asset_versions (recording_id);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_client_sha_idx   ON catalog_asset_versions (client_sha256);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_verified_sha_idx ON catalog_asset_versions (verified_sha256);
CREATE INDEX IF NOT EXISTS catalog_asset_versions_upload_status_idx ON catalog_asset_versions (upload_status);
-- At most one primary version per recording — DB-enforced.
CREATE UNIQUE INDEX IF NOT EXISTS catalog_asset_versions_one_primary_per_recording
  ON catalog_asset_versions (recording_id) WHERE is_primary;

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
CREATE TRIGGER catalog_asset_versions_touch_updated_at_trg
  BEFORE UPDATE ON catalog_asset_versions
  FOR EACH ROW EXECUTE FUNCTION catalog_touch_updated_at();

-- ============================================================================
-- catalog_asset_lineage — parent -> child derivation edges. Zero or one
-- parent per version. Multi-hop cycle prevention is now DB-enforced
-- ([P0-003 FIX] #4), not app-code-only as the proposal left it.
-- ============================================================================
CREATE TABLE IF NOT EXISTS catalog_asset_lineage (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_version_id        UUID        NOT NULL REFERENCES catalog_asset_versions(id) ON DELETE CASCADE,
  parent_asset_version_id UUID        REFERENCES catalog_asset_versions(id) ON DELETE SET NULL,
  derivation_type         TEXT        NOT NULL,
  -- [P0-003 FIX] #5b — chain-of-custody attribution for the derivation,
  -- mirroring catalog_works.created_by. Nullable + ON DELETE SET NULL.
  created_by              UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT catalog_asset_lineage_no_self_parent
    CHECK (parent_asset_version_id IS DISTINCT FROM asset_version_id)
);
CREATE INDEX IF NOT EXISTS catalog_asset_lineage_version_idx ON catalog_asset_lineage (asset_version_id);
CREATE INDEX IF NOT EXISTS catalog_asset_lineage_parent_idx  ON catalog_asset_lineage (parent_asset_version_id);
-- Exactly zero or one parent per child version.
CREATE UNIQUE INDEX IF NOT EXISTS catalog_asset_lineage_one_parent_per_version
  ON catalog_asset_lineage (asset_version_id);

-- [P0-003 FIX] #4 — DB-level multi-hop cycle prevention. Mirrors
-- lib/catalog/lineage.ts::wouldCreateCycle: reject the edge if
-- NEW.asset_version_id is already an ancestor of NEW.parent_asset_version_id
-- (i.e. the proposed parent descends from the child). Recursive CTE walk of
-- the ancestor chain — cheap at V1 scale, and lineage is only ever written
-- through controlled paths.
CREATE OR REPLACE FUNCTION catalog_asset_lineage_no_cycle() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_asset_version_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_asset_version_id = NEW.asset_version_id THEN
    RAISE EXCEPTION 'catalog_asset_lineage: a version cannot be its own parent (%)', NEW.asset_version_id;
  END IF;
  IF EXISTS (
    WITH RECURSIVE ancestors(av) AS (
      SELECT l.parent_asset_version_id
      FROM catalog_asset_lineage l
      WHERE l.asset_version_id = NEW.parent_asset_version_id
        AND l.parent_asset_version_id IS NOT NULL
      UNION
      SELECT l.parent_asset_version_id
      FROM catalog_asset_lineage l
      JOIN ancestors a ON l.asset_version_id = a.av
      WHERE l.parent_asset_version_id IS NOT NULL
    )
    SELECT 1 FROM ancestors WHERE av = NEW.asset_version_id
  ) THEN
    RAISE EXCEPTION 'catalog_asset_lineage: derivation % -> % would create a cycle', NEW.parent_asset_version_id, NEW.asset_version_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER catalog_asset_lineage_no_cycle_trg
  BEFORE INSERT OR UPDATE ON catalog_asset_lineage
  FOR EACH ROW EXECUTE FUNCTION catalog_asset_lineage_no_cycle();

-- ============================================================================
-- catalog_verification_jobs — worker claim / lease bookkeeping (Part 6,
-- Option B: a separate table, not claim columns on catalog_asset_versions).
-- READY AS-IS from the proposal. The claim primitive
-- (FOR UPDATE SKIP LOCKED) is documented for the future worker, not applied
-- as a stored procedure this pass.
-- ============================================================================
CREATE TABLE IF NOT EXISTS catalog_verification_jobs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_version_id  UUID        NOT NULL UNIQUE REFERENCES catalog_asset_versions(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN
                       ('pending', 'claimed', 'completed', 'failed')),
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
CREATE TRIGGER catalog_verification_jobs_touch_updated_at_trg
  BEFORE UPDATE ON catalog_verification_jobs
  FOR EACH ROW EXECUTE FUNCTION catalog_touch_updated_at();

-- ============================================================================
-- catalog_review_flags — multiple independent human-review reasons per
-- subject, current-state model (resolution HISTORY lives in
-- catalog_audit_log, not duplicated here). [P0-003 FIX] #7 adds a partial
-- unique index so the same reason can't be OPEN twice on one subject.
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
CREATE UNIQUE INDEX IF NOT EXISTS catalog_review_flags_one_open_per_reason
  ON catalog_review_flags (subject_type, subject_id, reason_code) WHERE status = 'open';

-- ============================================================================
-- [P0-003 FIX] #6 — Audit integration. The proposal wired NO audit triggers;
-- a founder-reviewable chain of custody needs the two "this happened and
-- can't have happened silently" facts recorded immutably in
-- catalog_audit_log (A5), the same DB-enforced way A2 records rights_changed:
--
--   * catalog_asset_versions INSERT  -> 'intake_created'
--   * catalog_asset_lineage   INSERT -> 'lineage_created'
--
-- The lifecycle TRANSITION events (verification_passed / verification_failed
-- / hash_verified / review_approved / review_rejected / ...) are emitted by
-- the adapter layer (lib/db/catalogAssets.ts), NOT by a trigger — because
-- those transitions have a real actor (a worker instance, or a human
-- reviewer) that only the calling code knows. A trigger would have to invent
-- an actor. See docs/SUMG_CAT_P0_003_MASTERVAULT_A1.md §Audit coverage.
--
-- Actor mapping (reuses A5's five actor_type values, no new ones; every
-- branch satisfies catalog_audit_log_no_human_spoof by construction):
--   uploaded_by / created_by present -> actor_type 'human', actor = that UUID
--   else                             -> actor_type 'system', actor = NULL
-- ============================================================================
CREATE OR REPLACE FUNCTION catalog_asset_versions_intake_audit() RETURNS trigger AS $$
BEGIN
  INSERT INTO catalog_audit_log (actor, actor_type, actor_label, action, object_type, object_id, previous_state, new_state, occurred_at, source)
  VALUES (
    NEW.uploaded_by,
    CASE WHEN NEW.uploaded_by IS NOT NULL THEN 'human' ELSE 'system' END,
    COALESCE(NEW.uploaded_by::text, NEW.source),
    'intake_created',
    'catalog_asset_versions',
    NEW.id::text,
    NULL,
    to_jsonb(NEW),
    now(),
    NEW.source
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER catalog_asset_versions_intake_audit_trg
  AFTER INSERT ON catalog_asset_versions
  FOR EACH ROW EXECUTE FUNCTION catalog_asset_versions_intake_audit();

CREATE OR REPLACE FUNCTION catalog_asset_lineage_created_audit() RETURNS trigger AS $$
BEGIN
  INSERT INTO catalog_audit_log (actor, actor_type, actor_label, action, object_type, object_id, previous_state, new_state, occurred_at, source)
  VALUES (
    NEW.created_by,
    CASE WHEN NEW.created_by IS NOT NULL THEN 'human' ELSE 'system' END,
    COALESCE(NEW.created_by::text, 'catalog_asset_lineage'),
    'lineage_created',
    'catalog_asset_lineage',
    NEW.id::text,
    NULL,
    to_jsonb(NEW),
    now(),
    NEW.derivation_type
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER catalog_asset_lineage_created_audit_trg
  AFTER INSERT ON catalog_asset_lineage
  FOR EACH ROW EXECUTE FUNCTION catalog_asset_lineage_created_audit();

-- ============================================================================
-- RLS — internal catalog data = default deny. Single is_cms_role() policy per
-- table (the A2/A5 pattern). No public/anon policy anywhere in this slice.
-- Vault object refs must never be reachable via an anon policy.
-- ============================================================================
ALTER TABLE catalog_works                ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_recordings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_asset_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_asset_lineage        ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_verification_jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_review_flags         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms all catalog_works"             ON catalog_works             FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_recordings"        ON catalog_recordings        FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_asset_versions"    ON catalog_asset_versions    FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_asset_lineage"     ON catalog_asset_lineage     FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_verification_jobs" ON catalog_verification_jobs FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_review_flags"      ON catalog_review_flags      FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());

-- ============================================================================
-- Reversal (forward-only migration; this is the manual down-path, not run
-- automatically):
--
--   DROP TRIGGER IF EXISTS catalog_asset_lineage_created_audit_trg ON catalog_asset_lineage;
--   DROP TRIGGER IF EXISTS catalog_asset_versions_intake_audit_trg ON catalog_asset_versions;
--   DROP FUNCTION IF EXISTS catalog_asset_lineage_created_audit();
--   DROP FUNCTION IF EXISTS catalog_asset_versions_intake_audit();
--   DROP TABLE IF EXISTS catalog_review_flags, catalog_verification_jobs,
--     catalog_asset_lineage, catalog_asset_versions, catalog_recordings, catalog_works CASCADE;
--   DROP FUNCTION IF EXISTS catalog_asset_lineage_no_cycle(),
--     catalog_asset_versions_recording_id_immutable(),
--     catalog_recordings_work_id_immutable(), catalog_touch_updated_at();
--
-- Dropping the tables CASCADE-drops their own triggers/policies. This does
-- NOT touch catalog_audit_log rows already written (append-only, by design)
-- — the 'intake_created' / 'lineage_created' history survives a schema
-- reversal, which is correct.
-- ============================================================================
