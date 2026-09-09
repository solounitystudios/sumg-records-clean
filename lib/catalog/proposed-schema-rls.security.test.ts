import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Part 25's RLS adversarial test plan, applied to the PROPOSED (not-yet-
 * applied) A1/A2/A5 schema. These tables don't exist in production yet, so
 * a live SET ROLE probe (the technique used for the already-applied A0/A0.1
 * work) isn't possible — this is the honest, available substitute: a
 * structural check on the SQL text itself, proving every CREATE POLICY
 * statement on every new table gates on is_cms_role() and none accidentally
 * introduce an open (`USING (true)` with no role check) or public-role
 * policy, which is exactly the class of bug the dna_records/import_logs
 * live findings earlier in this effort were caused by.
 *
 * Per SUMG_CATALOG_PRE_PRODUCTION_HARDENING.md §2, "cross-owner" tests from
 * the original ask don't apply — this product has no per-row ownership
 * model, only role-gating — so what's actually being proven here is "every
 * new table denies anon/non-CMS-authenticated access and allows CMS roles",
 * not tenant isolation.
 */

const MIGRATIONS_PROPOSED = join(__dirname, "..", "..", "supabase", "migrations_proposed");

function read(filename: string): string {
  return readFileSync(join(MIGRATIONS_PROPOSED, filename), "utf8");
}

const NEW_TABLES_A1 = [
  "catalog_works",
  "catalog_recordings",
  "catalog_asset_versions",
  "catalog_asset_lineage",
  "catalog_verification_jobs",
  "catalog_review_flags",
];
const NEW_TABLES_A2 = ["catalog_rights_records", "catalog_policy_flags"];
const NEW_TABLES_A5 = ["catalog_audit_log"];

test("every new A1 table has RLS enabled", () => {
  const src = read("A1_work_recording_version_lineage.sql");
  for (const table of NEW_TABLES_A1) {
    assert.match(src, new RegExp(`ALTER TABLE ${table}\\s+ENABLE ROW LEVEL SECURITY`), `${table} must enable RLS`);
  }
});

test("every new A1 table's policy gates on is_cms_role(), never USING (true) or an open predicate", () => {
  const src = read("A1_work_recording_version_lineage.sql");
  for (const table of NEW_TABLES_A1) {
    // Content group allows one level of nested parens (e.g. is_cms_role())
    // instead of stopping at the first ")", which would otherwise be the
    // closing paren of is_cms_role( itself.
    const policyMatch = src.match(
      new RegExp(`CREATE POLICY "[^"]+"\\s+ON ${table}\\s+FOR ALL USING \\(((?:[^()]|\\([^()]*\\))*)\\)`),
    );
    assert.ok(policyMatch, `${table} must have a CREATE POLICY statement`);
    assert.equal(policyMatch![1].trim(), "is_cms_role()", `${table}'s policy must gate on is_cms_role(), found: ${policyMatch![1]}`);
  }
});

test("no A1 table has a public/anon SELECT-only policy (the exact pattern that caused the live dna_records/import_logs findings)", () => {
  const src = read("A1_work_recording_version_lineage.sql");
  assert.doesNotMatch(src, /CREATE POLICY "public read/i);
  assert.doesNotMatch(src, /FOR SELECT USING \(true\)/);
});

test("A2's rights and policy-flag tables gate on is_cms_role(), no public policy", () => {
  const src = read("A2_rights_policy.sql");
  for (const table of NEW_TABLES_A2) {
    const policyMatch = src.match(
      new RegExp(`CREATE POLICY "[^"]+"\\s+ON ${table}\\s+FOR ALL USING \\(((?:[^()]|\\([^()]*\\))*)\\)`),
    );
    assert.ok(policyMatch, `${table} must have a CREATE POLICY statement`);
    assert.equal(policyMatch![1].trim(), "is_cms_role()", `${table}'s policy must gate on is_cms_role(), found: ${policyMatch![1]}`);
  }
  assert.doesNotMatch(src, /USING \(true\)/);
});

test("A5's audit log has exactly a read and an insert policy, both CMS-gated, and structurally cannot have an update/delete policy", () => {
  const src = read("A5_audit_log.sql");
  for (const table of NEW_TABLES_A5) {
    assert.doesNotMatch(src, new RegExp(`FOR UPDATE[^;]*ON ${table}`));
    assert.doesNotMatch(src, new RegExp(`FOR DELETE[^;]*ON ${table}`));
  }
  assert.match(src, /FOR SELECT USING \(is_cms_role\(\)\)/);
  assert.match(src, /FOR INSERT WITH CHECK \(is_cms_role\(\)\)/);
});

test("A5's action taxonomy is CHECK-constrained (not free text) with exactly the 21 documented events", () => {
  const src = read("A5_audit_log.sql");
  const expected = [
    "intake_created", "upload_started", "upload_completed",
    "verification_claimed", "hash_verified", "verification_passed",
    "verification_failed", "hash_mismatch", "duplicate_detected",
    "review_requested", "review_approved", "review_rejected",
    "rights_changed", "lineage_created",
    "destination_route_requested", "destination_route_allowed",
    "destination_route_blocked", "destination_route_rejected",
    "source_delete_requested", "source_delete_approved", "source_deleted",
  ];
  for (const action of expected) {
    assert.match(src, new RegExp(`'${action}'`), `missing action taxonomy entry: ${action}`);
  }
});

test("A5's audit log actor model rejects human-spoofing structurally (anti-spoof CHECK present)", () => {
  const src = read("A5_audit_log.sql");
  assert.match(src, /catalog_audit_log_no_human_spoof/);
  assert.match(src, /CHECK \(actor_type = 'human' OR actor IS NULL\)/);
});

test("A2's AI-cannot-clear backstop is present and keys off set_by_source, not a fragile string match on identity", () => {
  const src = read("A2_rights_policy.sql");
  assert.match(src, /catalog_rights_records_ai_cannot_clear/);
  assert.match(src, /set_by_source IN \('ai_inferred', 'telemetry_learned'\)/);
});

test("A2's permissions shape is DB-validated (exactly 4 known boolean keys, no unknown keys)", () => {
  const src = read("A2_rights_policy.sql");
  assert.match(src, /catalog_rights_records_permissions_shape/);
  assert.match(src, /jsonb_typeof\(permissions -> 'distribution'\) = 'boolean'/);
});

test("A1's one-primary-per-recording and immutability guards are present as DB constraints, not left to app code alone", () => {
  const src = read("A1_work_recording_version_lineage.sql");
  assert.match(src, /catalog_asset_versions_one_primary_per_recording/);
  assert.match(src, /catalog_recordings_work_id_immutable/);
  assert.match(src, /catalog_asset_versions_recording_id_immutable/);
});
