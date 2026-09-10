-- SUMG-CAT-P0-003 — real database integration test for the MasterVault + A1
-- vertical slice, after applying:
--   20260909180000_catalog_a1_work_recording_version_lineage.sql
--   20260909180100_catalog_master_vault_storage.sql   (bucket only; Storage
--                                                       object writes are not
--                                                       exercised from SQL)
-- plus the already-applied A5 (catalog_audit_log) and A2 (catalog_rights_records).
--
-- WHY THIS FILE EXISTS: same reason as sumg-cat-p0-002-audit-trigger.sql —
-- this repo's CI runs Node's test runner against pure TypeScript only; there
-- is no Postgres in CI. lib/catalog/a1-schema.security.test.ts covers the SQL
-- text structurally; this script is the real end-to-end execution proof of
-- the governed chain of custody, written to be safely re-run against a real
-- database (it wraps everything in BEGIN/ROLLBACK and never commits).
--
-- HOW TO RUN: paste into the Supabase SQL editor (or psql) against a database
-- that has the four migrations above applied. Reaching "ALL P0-003 TESTS
-- PASSED" with a clean ROLLBACK means every case is verified against the
-- live schema. Nothing persists — no Work, Recording, Asset Version, Lineage,
-- Verification Job, Review Flag, Rights Record, or audit row survives.
--
-- The chain proven:
--   WORK -> RECORDING -> ASSET VERSION -> (vault ref bound by CHECK) ->
--   VERIFICATION -> LINEAGE (original -> normalized derivative) -> REVIEW FLAG
--   -> RIGHTS RECORD (via the P0-002 layer, subject_type='recording') ->
--   IMMUTABLE AUDIT EVIDENCE (intake_created, lineage_created, rights_changed)
--   -> assembled read-back.

BEGIN;

DO $test$
DECLARE
  human_uuid       UUID;
  w                catalog_works%ROWTYPE;
  rec              catalog_recordings%ROWTYPE;
  ver              catalog_asset_versions%ROWTYPE;
  deriv            catalog_asset_versions%ROWTYPE;
  mm_ver           catalog_asset_versions%ROWTYPE;
  mm_job           catalog_verification_jobs%ROWTYPE;
  lin              catalog_asset_lineage%ROWTYPE;
  vjob             catalog_verification_jobs%ROWTYPE;
  flag             catalog_review_flags%ROWTYPE;
  rights_row       catalog_rights_records%ROWTYPE;
  a                catalog_audit_log%ROWTYPE;
  good_ref         TEXT;
  n                INT;
BEGIN
  SELECT id INTO human_uuid FROM auth.users LIMIT 1;
  IF human_uuid IS NULL THEN
    RAISE EXCEPTION 'no auth.users row available for the human-actor cases';
  END IF;

  -- ── 1. WORK ──────────────────────────────────────────────────────────
  INSERT INTO catalog_works (title, song_id, created_by, status)
  VALUES ('__sumg_p0003_vertical_slice__', NULL, human_uuid, 'intake')
  RETURNING * INTO w;
  IF w.id IS NULL THEN RAISE EXCEPTION 'CASE 1 FAILED: work not created'; END IF;
  RAISE NOTICE 'CASE 1 PASSED: Work % created', w.id;

  -- ── 2. RECORDING ─────────────────────────────────────────────────────
  INSERT INTO catalog_recordings (work_id, artist_slug)
  VALUES (w.id, 'sumg-p0003-test')
  RETURNING * INTO rec;
  IF rec.work_id IS DISTINCT FROM w.id THEN RAISE EXCEPTION 'CASE 2 FAILED: recording.work_id mismatch'; END IF;
  RAISE NOTICE 'CASE 2 PASSED: Recording % created', rec.id;

  -- work_id is immutable
  BEGIN
    UPDATE catalog_recordings SET work_id = gen_random_uuid() WHERE id = rec.id;
    RAISE EXCEPTION 'CASE 2b FAILED: recording.work_id was mutable';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%CASE 2b FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'CASE 2b PASSED: recording.work_id immutable (%)', SQLERRM;
  END;

  -- ── 3. ASSET VERSION (primary master) ────────────────────────────────
  INSERT INTO catalog_asset_versions (recording_id, version_kind, source, uploaded_by, client_sha256, mime_type, size_bytes, is_primary)
  VALUES (rec.id, 'master', 'manual_upload', human_uuid, 'deadbeef', 'audio/wav', 4096, true)
  RETURNING * INTO ver;
  IF ver.upload_status IS DISTINCT FROM 'pending_upload' OR ver.review_status IS DISTINCT FROM 'pending_review' THEN
    RAISE EXCEPTION 'CASE 3 FAILED: unexpected default statuses % / %', ver.upload_status, ver.review_status;
  END IF;
  RAISE NOTICE 'CASE 3 PASSED: Asset Version % created (pending_upload / pending_review)', ver.id;

  -- ── 4. intake_created audit evidence ─────────────────────────────────
  SELECT * INTO a FROM catalog_audit_log
   WHERE object_type = 'catalog_asset_versions' AND object_id = ver.id::text AND action = 'intake_created';
  IF a.id IS NULL THEN RAISE EXCEPTION 'CASE 4 FAILED: no intake_created audit row'; END IF;
  IF a.actor_type IS DISTINCT FROM 'human' OR a.actor IS DISTINCT FROM human_uuid THEN
    RAISE EXCEPTION 'CASE 4 FAILED: intake_created actor semantics wrong: type=%, actor=%', a.actor_type, a.actor;
  END IF;
  RAISE NOTICE 'CASE 4 PASSED: intake_created audit row, actor_type=human, actor=uploader';

  -- ── 5. vault_object_ref CHECK — accepts this row's own canonical key ──
  good_ref := 'masters/' || rec.id::text || '/' || ver.id::text || '/original.wav';
  UPDATE catalog_asset_versions SET vault_object_ref = good_ref, upload_status = 'uploaded_unverified' WHERE id = ver.id;
  RAISE NOTICE 'CASE 5 PASSED: vault_object_ref CHECK accepted the canonical key';

  -- ── 5b. vault_object_ref CHECK — rejects another row's key / bad shape ─
  BEGIN
    UPDATE catalog_asset_versions
       SET vault_object_ref = 'masters/' || gen_random_uuid()::text || '/' || gen_random_uuid()::text || '/original.wav'
     WHERE id = ver.id;
    RAISE EXCEPTION 'CASE 5b FAILED: CHECK allowed a foreign object key';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%CASE 5b FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'CASE 5b PASSED: vault_object_ref CHECK rejected a foreign/tampered key';
  END;
  BEGIN
    UPDATE catalog_asset_versions SET vault_object_ref = good_ref || '.exe' WHERE id = ver.id;
    RAISE EXCEPTION 'CASE 5c FAILED: CHECK allowed a non-audio extension';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%CASE 5c FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'CASE 5c PASSED: vault_object_ref CHECK rejected a bad extension';
  END;

  -- ── 6. VERIFICATION state ────────────────────────────────────────────
  INSERT INTO catalog_verification_jobs (asset_version_id) VALUES (ver.id) RETURNING * INTO vjob;
  UPDATE catalog_asset_versions SET verified_sha256 = 'deadbeef', upload_status = 'verified' WHERE id = ver.id;
  UPDATE catalog_verification_jobs SET status = 'completed', completed_at = now() WHERE id = vjob.id;
  SELECT * INTO ver FROM catalog_asset_versions WHERE id = ver.id;
  IF ver.verified_sha256 IS DISTINCT FROM 'deadbeef' OR ver.upload_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'CASE 6 FAILED: verification state not persisted';
  END IF;
  RAISE NOTICE 'CASE 6 PASSED: verification job + verified_sha256 + upload_status=verified persisted';

  -- recording_id is immutable
  BEGIN
    UPDATE catalog_asset_versions SET recording_id = gen_random_uuid() WHERE id = ver.id;
    RAISE EXCEPTION 'CASE 6b FAILED: asset_version.recording_id was mutable';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%CASE 6b FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'CASE 6b PASSED: asset_version.recording_id immutable';
  END;

  -- ── 6c. HASH MISMATCH failure state is representable (SUMG-CAT-P0-003 FIX 1)
  -- The mismatch -> verification_failed routing is application logic
  -- (lib/db/catalogAssets.ts::recordVerification, unit-tested in
  -- asset-store.test.ts). Here we prove the SCHEMA can hold the failure
  -- shape end to end: a present client claim, a DIFFERENT authoritative
  -- verified_sha256, upload_status='verification_failed', the job failed
  -- with last_error_code='hash_mismatch', and an OPEN hash_mismatch review
  -- flag — all on one row, with client_sha256 untouched.
  INSERT INTO catalog_asset_versions (recording_id, version_kind, source, uploaded_by, client_sha256)
  VALUES (rec.id, 'other', 'worker_derivative', NULL, 'client-claim-AAA')
  RETURNING * INTO mm_ver;
  INSERT INTO catalog_verification_jobs (asset_version_id) VALUES (mm_ver.id) RETURNING * INTO mm_job;

  UPDATE catalog_asset_versions
     SET verified_sha256 = 'authoritative-BBB', upload_status = 'verification_failed'
   WHERE id = mm_ver.id;
  UPDATE catalog_verification_jobs
     SET status = 'failed', last_attempt_at = now(),
         last_error_code = 'hash_mismatch',
         last_error_detail = 'client_sha256=client-claim-AAA verified_sha256=authoritative-BBB'
   WHERE id = mm_job.id;
  INSERT INTO catalog_review_flags (subject_type, subject_id, reason_code, severity, detail)
  VALUES ('asset_version', mm_ver.id, 'hash_mismatch', 'blocked',
          'authoritative stored-object hash does not match the client-submitted advisory hash');

  SELECT * INTO mm_ver FROM catalog_asset_versions WHERE id = mm_ver.id;
  SELECT * INTO mm_job FROM catalog_verification_jobs WHERE id = mm_job.id;
  IF mm_ver.upload_status <> 'verification_failed' THEN
    RAISE EXCEPTION 'CASE 6c FAILED: mismatch upload_status is %, not verification_failed', mm_ver.upload_status;
  END IF;
  IF mm_ver.verified_sha256 <> 'authoritative-BBB' THEN
    RAISE EXCEPTION 'CASE 6c FAILED: authoritative verified_sha256 not preserved (%)', mm_ver.verified_sha256;
  END IF;
  IF mm_ver.client_sha256 <> 'client-claim-AAA' THEN
    RAISE EXCEPTION 'CASE 6c FAILED: client_sha256 was mutated to %', mm_ver.client_sha256;
  END IF;
  IF mm_job.status <> 'failed' OR mm_job.last_error_code <> 'hash_mismatch' OR mm_job.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'CASE 6c FAILED: verification job does not reflect a hash_mismatch failure';
  END IF;
  SELECT count(*) INTO n FROM catalog_review_flags
   WHERE subject_type = 'asset_version' AND subject_id = mm_ver.id
     AND reason_code = 'hash_mismatch' AND status = 'open';
  IF n <> 1 THEN RAISE EXCEPTION 'CASE 6c FAILED: expected exactly 1 open hash_mismatch flag, got %', n; END IF;
  RAISE NOTICE 'CASE 6c PASSED: hash mismatch -> verification_failed + preserved authoritative hash + failed job + open hash_mismatch flag';

  -- Clean up the mismatch fixture rows (scoped to their exact ids) so the
  -- later chain-count and business-data assertions are unaffected. The audit
  -- rows they produced via the intake trigger are append-only and stay.
  DELETE FROM catalog_review_flags WHERE subject_type = 'asset_version' AND subject_id = mm_ver.id;
  DELETE FROM catalog_asset_versions WHERE id = mm_ver.id;  -- CASCADEs mm_job

  -- ── 7. REVIEW state ──────────────────────────────────────────────────
  INSERT INTO catalog_review_flags (subject_type, subject_id, reason_code, severity, detail)
  VALUES ('asset_version', ver.id, 'rights_unknown', 'review', 'P0-003 slice: rights not yet attached')
  RETURNING * INTO flag;
  UPDATE catalog_asset_versions SET review_status = 'held' WHERE id = ver.id;
  RAISE NOTICE 'CASE 7 PASSED: review flag % (rights_unknown/review) + review_status=held', flag.id;

  -- duplicate OPEN flag of the same reason is rejected
  BEGIN
    INSERT INTO catalog_review_flags (subject_type, subject_id, reason_code, severity)
    VALUES ('asset_version', ver.id, 'rights_unknown', 'blocked');
    RAISE EXCEPTION 'CASE 7b FAILED: duplicate open review flag allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%CASE 7b FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'CASE 7b PASSED: duplicate open flag of the same reason rejected';
  END;

  -- ── 8. LINEAGE (original master -> normalized derivative) ─────────────
  INSERT INTO catalog_asset_versions (recording_id, version_kind, source, uploaded_by)
  VALUES (rec.id, 'other', 'worker_derivative', NULL)
  RETURNING * INTO deriv;
  INSERT INTO catalog_asset_lineage (asset_version_id, parent_asset_version_id, derivation_type, created_by)
  VALUES (deriv.id, ver.id, 'normalize', human_uuid)
  RETURNING * INTO lin;
  IF lin.parent_asset_version_id IS DISTINCT FROM ver.id THEN RAISE EXCEPTION 'CASE 8 FAILED: lineage parent mismatch'; END IF;
  RAISE NOTICE 'CASE 8 PASSED: lineage edge % (% -> %, normalize)', lin.id, ver.id, deriv.id;

  SELECT * INTO a FROM catalog_audit_log
   WHERE object_type = 'catalog_asset_lineage' AND object_id = lin.id::text AND action = 'lineage_created';
  IF a.id IS NULL THEN RAISE EXCEPTION 'CASE 8b FAILED: no lineage_created audit row'; END IF;
  IF a.actor_type IS DISTINCT FROM 'human' OR a.actor IS DISTINCT FROM human_uuid THEN
    RAISE EXCEPTION 'CASE 8b FAILED: lineage_created actor semantics wrong';
  END IF;
  RAISE NOTICE 'CASE 8b PASSED: lineage_created audit row, actor=creator';

  -- ── 9. LINEAGE cycle protection (DB trigger) ─────────────────────────
  BEGIN
    INSERT INTO catalog_asset_lineage (asset_version_id, parent_asset_version_id, derivation_type)
    VALUES (ver.id, deriv.id, 'normalize');
    RAISE EXCEPTION 'CASE 9 FAILED: cycle ver->deriv->ver was allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%CASE 9 FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'CASE 9 PASSED: multi-hop lineage cycle rejected by trigger';
  END;

  -- self-parent
  BEGIN
    INSERT INTO catalog_asset_lineage (asset_version_id, parent_asset_version_id, derivation_type)
    VALUES (deriv.id, deriv.id, 'normalize');
    RAISE EXCEPTION 'CASE 9b FAILED: self-parent allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%CASE 9b FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'CASE 9b PASSED: self-parent rejected';
  END;

  -- one parent per child version
  BEGIN
    INSERT INTO catalog_asset_lineage (asset_version_id, parent_asset_version_id, derivation_type)
    VALUES (deriv.id, ver.id, 'transcode');
    RAISE EXCEPTION 'CASE 9c FAILED: a version got two parents';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%CASE 9c FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'CASE 9c PASSED: one-parent-per-version enforced';
  END;

  -- one primary per recording
  BEGIN
    INSERT INTO catalog_asset_versions (recording_id, version_kind, source, uploaded_by, is_primary)
    VALUES (rec.id, 'master', 'manual_upload', human_uuid, true);
    RAISE EXCEPTION 'CASE 9d FAILED: two primary versions on one recording';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%CASE 9d FAILED%' THEN RAISE; END IF;
    RAISE NOTICE 'CASE 9d PASSED: one-primary-per-recording enforced';
  END;

  -- ── 10. RIGHTS via the P0-002 layer (subject_type='recording') ───────
  INSERT INTO catalog_rights_records (subject_type, subject_id, status, permissions, set_by, set_by_source)
  VALUES ('recording', rec.id::text, 'under_review',
          '{"distribution": false, "sync": false, "personaworks": false, "aiTraining": false}'::jsonb,
          human_uuid, 'founder_assigned')
  RETURNING * INTO rights_row;
  SELECT * INTO a FROM catalog_audit_log
   WHERE object_type = 'catalog_rights_records' AND object_id = rights_row.id::text AND action = 'rights_changed';
  IF a.id IS NULL THEN RAISE EXCEPTION 'CASE 10 FAILED: rights_changed audit row missing'; END IF;
  IF a.actor_type IS DISTINCT FROM 'human' THEN RAISE EXCEPTION 'CASE 10 FAILED: rights actor_type != human'; END IF;
  RAISE NOTICE 'CASE 10 PASSED: rights record attached to the A1 recording via P0-002, rights_changed audited';

  -- resolve the review flag now that rights are attached
  UPDATE catalog_review_flags SET status = 'resolved', resolved_at = now(), resolved_by = human_uuid, resolution = 'rights attached'
   WHERE id = flag.id;

  -- ── 11. RLS posture — every A1 table default-deny, is_cms_role() only ─
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public'
     AND c.relname IN ('catalog_works','catalog_recordings','catalog_asset_versions',
                       'catalog_asset_lineage','catalog_verification_jobs','catalog_review_flags')
     AND c.relrowsecurity;
  IF n <> 6 THEN RAISE EXCEPTION 'CASE 11 FAILED: only % of 6 A1 tables have RLS enabled', n; END IF;

  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('catalog_works','catalog_recordings','catalog_asset_versions',
                       'catalog_asset_lineage','catalog_verification_jobs','catalog_review_flags')
     AND (qual IS DISTINCT FROM 'is_cms_role()' OR with_check IS DISTINCT FROM 'is_cms_role()');
  IF n <> 0 THEN RAISE EXCEPTION 'CASE 11 FAILED: % A1 policies are not exactly is_cms_role()-gated', n; END IF;

  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('catalog_works','catalog_recordings','catalog_asset_versions',
                       'catalog_asset_lineage','catalog_verification_jobs','catalog_review_flags')
     AND (qual ILIKE '%true%' OR with_check ILIKE '%true%' OR 'anon' = ANY(roles) OR 'public' = ANY(roles));
  IF n <> 0 THEN RAISE EXCEPTION 'CASE 11 FAILED: an A1 policy is open / public / anon'; END IF;
  RAISE NOTICE 'CASE 11 PASSED: all 6 A1 tables RLS-on, is_cms_role() only, no open/anon/public policy';

  -- ── 12. Storage bucket posture (if the bucket migration is applied) ──
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sumg-master-vault') THEN
    PERFORM 1 FROM storage.buckets WHERE id = 'sumg-master-vault' AND public = false;
    IF NOT FOUND THEN RAISE EXCEPTION 'CASE 12 FAILED: sumg-master-vault bucket is public'; END IF;
    SELECT count(*) INTO n FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND policyname IN ('master vault cms read', 'master vault cms write')
       AND cmd IN ('SELECT','INSERT');
    IF n <> 2 THEN RAISE EXCEPTION 'CASE 12 FAILED: expected exactly the 2 CMS storage policies, found %', n; END IF;
    SELECT count(*) INTO n FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND (qual ILIKE '%sumg-master-vault%' OR with_check ILIKE '%sumg-master-vault%')
       AND cmd IN ('UPDATE','DELETE');
    IF n <> 0 THEN RAISE EXCEPTION 'CASE 12 FAILED: an UPDATE/DELETE storage policy exists for the vault bucket'; END IF;
    RAISE NOTICE 'CASE 12 PASSED: sumg-master-vault private, 2 CMS policies, no overwrite/delete path';
  ELSE
    RAISE NOTICE 'CASE 12 SKIPPED: sumg-master-vault bucket not present (apply 20260909180100 to include this check)';
  END IF;

  -- ── 13. Assembled audit evidence for the whole chain ────────────────
  SELECT count(*) INTO n FROM catalog_audit_log
   WHERE object_id IN (ver.id::text, deriv.id::text, lin.id::text, rights_row.id::text);
  -- expected: intake_created(ver) + intake_created(deriv) + lineage_created(lin) + rights_changed(rights) = 4
  IF n < 4 THEN RAISE EXCEPTION 'CASE 13 FAILED: expected >=4 audit rows for the chain, got %', n; END IF;
  RAISE NOTICE 'CASE 13 PASSED: % immutable audit rows recorded for the chain', n;

  -- ── 14. Existing production data untouched ──────────────────────────
  SELECT count(*) INTO n FROM songs;    IF n <> 32 THEN RAISE EXCEPTION 'CASE 14 FAILED: songs count changed: %', n; END IF;
  SELECT count(*) INTO n FROM releases; IF n <> 32 THEN RAISE EXCEPTION 'CASE 14 FAILED: releases count changed: %', n; END IF;
  RAISE NOTICE 'CASE 14 PASSED: songs=32, releases=32 unchanged';

  RAISE NOTICE 'ALL P0-003 TESTS PASSED';
END;
$test$;

ROLLBACK;
