import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * SUMG-CAT-P0-003 — structural checks on the PROMOTED A1 migration (the one
 * that actually ships, not the proposal). These can't replace a live DB run
 * (that lives in supabase/tests/sumg-cat-p0-003-vertical-slice.sql), but they
 * lock the security-relevant shape: every table RLS-gated on is_cms_role(),
 * no open/public policy, the audited narrow fixes present, and the migration
 * staying inside P0-003 scope (no A3/A4, no legacy-table mutation).
 */

const MIGRATIONS = join(__dirname, "..", "..", "supabase", "migrations");
const A1 = readFileSync(join(MIGRATIONS, "20260909180000_catalog_a1_work_recording_version_lineage.sql"), "utf8");

/** SQL with `-- ...` line comments removed — so "must not contain" checks test real DDL, not prose. */
const A1_CODE = A1.replace(/--.*$/gm, "");

const A1_TABLES = [
  "catalog_works",
  "catalog_recordings",
  "catalog_asset_versions",
  "catalog_asset_lineage",
  "catalog_verification_jobs",
  "catalog_review_flags",
];

test("every A1 table enables RLS", () => {
  for (const t of A1_TABLES) {
    assert.match(A1, new RegExp(`ALTER TABLE ${t}\\s+ENABLE ROW LEVEL SECURITY`), `${t} must enable RLS`);
  }
});

test("every A1 table's only policy gates on is_cms_role() — never USING (true) or a public role", () => {
  for (const t of A1_TABLES) {
    const m = A1.match(
      new RegExp(`CREATE POLICY "[^"]+"\\s+ON ${t}\\s+FOR ALL USING \\(((?:[^()]|\\([^()]*\\))*)\\) WITH CHECK \\(((?:[^()]|\\([^()]*\\))*)\\)`),
    );
    assert.ok(m, `${t} must have a single FOR ALL policy`);
    assert.equal(m![1].trim(), "is_cms_role()", `${t} USING must be is_cms_role()`);
    assert.equal(m![2].trim(), "is_cms_role()", `${t} WITH CHECK must be is_cms_role()`);
  }
});

test("no public / anon / open policy anywhere in A1", () => {
  assert.doesNotMatch(A1_CODE, /USING \(true\)/);
  assert.doesNotMatch(A1_CODE, /WITH CHECK \(true\)/);
  assert.doesNotMatch(A1_CODE, /CREATE POLICY "public/i);
  assert.doesNotMatch(A1_CODE, /TO anon\b/i);
  assert.doesNotMatch(A1_CODE, /FOR SELECT USING \(true\)/);
});

test("A1 does not modify or read the existing songs/releases rows (no backfill)", () => {
  assert.doesNotMatch(A1_CODE, /INSERT INTO songs/i);
  assert.doesNotMatch(A1_CODE, /UPDATE songs/i);
  assert.doesNotMatch(A1_CODE, /INSERT INTO releases/i);
  assert.doesNotMatch(A1_CODE, /UPDATE releases/i);
  assert.doesNotMatch(A1_CODE, /DELETE FROM (songs|releases)/i);
  // song_id is a nullable pointer only.
  assert.match(A1_CODE, /song_id\s+TEXT\s+REFERENCES songs\(id\) ON DELETE SET NULL/);
});

test("A1 stays in scope — no A3/A4 objects, no apparel/business-unit, no routing/destination tables", () => {
  for (const forbidden of [
    "catalog_editorial_decisions",
    "catalog_routing_recipes",
    "catalog_routing_decisions",
    "catalog_destination_assignments",
    "catalog_delivery_receipts",
    "apparel",
    "business_unit",
  ]) {
    assert.doesNotMatch(A1_CODE, new RegExp(forbidden, "i"), `A1 must not touch ${forbidden}`);
  }
});

// ── Audited narrow fixes ───────────────────────────────────────────────

test("[FIX #1] uploaded_by is nullable + ON DELETE SET NULL (provenance survives user deletion), not RESTRICT", () => {
  assert.match(A1_CODE, /uploaded_by\s+UUID\s+REFERENCES auth\.users\(id\) ON DELETE SET NULL/);
  assert.doesNotMatch(A1_CODE, /uploaded_by\s+UUID\s+NOT NULL/);
  assert.doesNotMatch(A1_CODE, /ON DELETE RESTRICT/);
});

test("[FIX #2] asset version source is CHECK-constrained, not free text", () => {
  assert.match(A1, /source\s+TEXT\s+NOT NULL DEFAULT 'manual_upload' CHECK \(source IN\s*\(\s*'manual_upload', 'worker_derivative', 'system_import', 'api_upload'\s*\)\)/);
});

test("[FIX #3] vault_object_ref is bound by a CHECK to this row's own recording_id + id + masters/ prefix", () => {
  assert.match(A1, /CONSTRAINT catalog_asset_versions_vault_ref_shape CHECK/);
  assert.match(A1, /vault_object_ref ~ \('\^masters\/' \|\| recording_id::text \|\| '\/' \|\| id::text \|\| '\/original\\\.\(wav\|flac\|aiff\|aif\|mp3\)\$'\)/);
});

test("[FIX #4] multi-hop lineage cycle prevention is DB-enforced (trigger + recursive CTE), not app-only", () => {
  assert.match(A1, /CREATE OR REPLACE FUNCTION catalog_asset_lineage_no_cycle\(\)/);
  assert.match(A1, /WITH RECURSIVE ancestors/);
  assert.match(A1, /CREATE TRIGGER catalog_asset_lineage_no_cycle_trg\s+BEFORE INSERT OR UPDATE ON catalog_asset_lineage/);
});

test("[FIX #5] updated_at is trigger-maintained on works/asset_versions/verification_jobs", () => {
  assert.match(A1, /CREATE OR REPLACE FUNCTION catalog_touch_updated_at\(\)/);
  for (const t of ["catalog_works", "catalog_asset_versions", "catalog_verification_jobs"]) {
    assert.match(A1, new RegExp(`CREATE TRIGGER ${t}_touch_updated_at_trg\\s+BEFORE UPDATE ON ${t}`));
  }
});

test("[FIX #6] audit integration — intake_created + lineage_created triggers write A5's catalog_audit_log", () => {
  assert.match(A1, /CREATE OR REPLACE FUNCTION catalog_asset_versions_intake_audit\(\)/);
  assert.match(A1, /CREATE OR REPLACE FUNCTION catalog_asset_lineage_created_audit\(\)/);
  assert.match(A1, /INSERT INTO catalog_audit_log \(actor, actor_type, actor_label, action, object_type, object_id, previous_state, new_state, occurred_at, source\)/);
  assert.match(A1, /'intake_created'/);
  assert.match(A1, /'lineage_created'/);
  assert.match(A1, /CREATE TRIGGER catalog_asset_versions_intake_audit_trg\s+AFTER INSERT ON catalog_asset_versions/);
  assert.match(A1, /CREATE TRIGGER catalog_asset_lineage_created_audit_trg\s+AFTER INSERT ON catalog_asset_lineage/);
});

test("[FIX #6] audit triggers only ever assign A5's five actor_type values and satisfy no_human_spoof by construction", () => {
  const assigns = [...A1_CODE.matchAll(/CASE WHEN NEW\.(uploaded_by|created_by) IS NOT NULL THEN 'human' ELSE 'system' END/g)];
  assert.equal(assigns.length, 2, "both audit triggers must derive actor_type as human-iff-actor-present");
  // actor column is always the raw NEW.uploaded_by / NEW.created_by, never a literal.
  assert.doesNotMatch(A1_CODE, /VALUES\s*\(\s*'[0-9a-f-]{36}'/i);
});

test("[FIX #7] review flags cannot have the same reason OPEN twice on one subject", () => {
  assert.match(A1, /CREATE UNIQUE INDEX IF NOT EXISTS catalog_review_flags_one_open_per_reason\s+ON catalog_review_flags \(subject_type, subject_id, reason_code\) WHERE status = 'open'/);
});

// ── Graph-integrity guards retained from the proposal ──────────────────

test("recording.work_id and asset_version.recording_id immutability guards are present", () => {
  assert.match(A1, /catalog_recordings_work_id_immutable/);
  assert.match(A1, /catalog_asset_versions_recording_id_immutable/);
});

test("one-primary-per-recording and one-parent-per-version are DB unique indexes", () => {
  assert.match(A1, /CREATE UNIQUE INDEX IF NOT EXISTS catalog_asset_versions_one_primary_per_recording\s+ON catalog_asset_versions \(recording_id\) WHERE is_primary/);
  assert.match(A1, /CREATE UNIQUE INDEX IF NOT EXISTS catalog_asset_lineage_one_parent_per_version\s+ON catalog_asset_lineage \(asset_version_id\)/);
});

test("catalog_asset_versions references the Private Vault only by an opaque key column — never a URL column", () => {
  assert.match(A1, /vault_object_ref\s+TEXT/);
  assert.doesNotMatch(A1, /vault_object_url/i);
  assert.doesNotMatch(A1, /public_url/i);
});
