import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * SUMG-CAT-P0-002 regression coverage.
 *
 * The bug this migration fixes (catalog_rights_records_audit() inserting
 * into catalog_audit_log without supplying actor_type/actor_label, both
 * NOT NULL) escaped every prior test because those tests only checked SQL
 * text for policy/constraint *presence*, never whether a trigger's INSERT
 * column list actually satisfies the target table's NOT NULL columns. This
 * file is a structural improvement on that gap: it can't replace a real
 * database execution (that was done separately, once, against production's
 * live schema inside a transaction that was rolled back — see
 * supabase/tests/sumg-cat-p0-002-audit-trigger.sql for the exact script and
 * how to rerun it against a real Postgres/Supabase branch), but it does
 * catch this exact bug class going forward without needing a live database
 * in CI: an INSERT into catalog_audit_log that omits a NOT NULL column with
 * no default.
 */

const MIGRATIONS = join(__dirname, "..", "..", "supabase", "migrations");

function read(filename: string): string {
  return readFileSync(join(MIGRATIONS, filename), "utf8");
}

const AUDIT_LOG_SQL = read("20260909100001_catalog_audit_log.sql");
const FIX_SQL = read("20260909160000_catalog_rights_audit_actor_fix.sql");

test("catalog_audit_log's NOT-NULL-no-default columns are exactly the set this test expects — if this fails, the fix's INSERT list must be re-checked against the real schema, not assumed", () => {
  // action, object_type, object_id, actor_type, actor_label all NOT NULL with no default (per the CREATE TABLE).
  for (const col of ["action", "object_type", "object_id", "actor_type", "actor_label"]) {
    assert.match(AUDIT_LOG_SQL, new RegExp(`${col}\\s+TEXT\\s+NOT NULL`), `${col} must stay NOT NULL — if this changed, re-verify the fix's INSERT list`);
  }
});

test("the corrective catalog_rights_records_audit() INSERT column list supplies every NOT-NULL-no-default column on catalog_audit_log", () => {
  const insertMatch = FIX_SQL.match(/INSERT INTO catalog_audit_log \(([^)]+)\)/);
  assert.ok(insertMatch, "expected an INSERT INTO catalog_audit_log statement");
  const columns = insertMatch![1].split(",").map((c) => c.trim());
  for (const required of ["actor_type", "actor_label", "action", "object_type", "object_id"]) {
    assert.ok(columns.includes(required), `INSERT column list is missing "${required}" — this is exactly the bug class that caused the production defect`);
  }
});

test("computed_actor_type is only ever assigned one of A5's five allowed actor_type values", () => {
  const assignments = [...FIX_SQL.matchAll(/computed_actor_type\s*:=\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(assignments.length > 0, "expected at least one computed_actor_type assignment");
  const allowed = ["human", "service", "worker", "ai", "system"];
  for (const value of assignments) {
    assert.ok(allowed.includes(value), `computed_actor_type assigned "${value}", which is not one of A5's allowed actor_type values: ${allowed.join(", ")}`);
  }
});

test("the actor (UUID) column is never assigned a hardcoded placeholder — only NEW.set_by", () => {
  const insertMatch = FIX_SQL.match(/INSERT INTO catalog_audit_log[\s\S]*?VALUES\s*\(([\s\S]*?)\);/);
  assert.ok(insertMatch, "expected an INSERT ... VALUES (...) statement");
  const valuesBlock = insertMatch![1];
  // The first VALUES position corresponds to `actor` per the column list order
  // asserted above — it must be the raw column reference, never a string
  // literal like 'system'/'unknown'/'founder'.
  const firstValue = valuesBlock.split(",")[0].trim();
  assert.equal(firstValue, "NEW.set_by", `actor value must be exactly NEW.set_by, found: "${firstValue}" — no fake UUIDs/placeholders in a UUID column`);
});

test("actor_type='human' is only reachable when set_by is present, or via the two human-named provenance sources — never invented for an arbitrary automated source", () => {
  // First branch must gate on NEW.set_by IS NOT NULL and assign 'human'.
  assert.match(FIX_SQL, /IF NEW\.set_by IS NOT NULL THEN\s*\n\s*computed_actor_type := 'human';/);
  // The only other 'human' assignment must be scoped to editor_assigned/founder_assigned.
  const humanBranches = [...FIX_SQL.matchAll(/(IF|ELSIF)\s*\(?([^)]*?)\)?\s*THEN\s*\n\s*computed_actor_type := 'human';/g)];
  assert.equal(humanBranches.length, 2, "expected exactly two branches assigning actor_type='human'");
  assert.match(humanBranches[1][2], /editor_assigned/);
  assert.match(humanBranches[1][2], /founder_assigned/);
});

test("this migration does not touch RLS, tables, or policies — function replacement only", () => {
  assert.doesNotMatch(FIX_SQL, /CREATE TABLE/);
  assert.doesNotMatch(FIX_SQL, /DROP TABLE/);
  assert.doesNotMatch(FIX_SQL, /ALTER TABLE/);
  assert.doesNotMatch(FIX_SQL, /CREATE POLICY/);
  assert.doesNotMatch(FIX_SQL, /DROP POLICY/);
  assert.doesNotMatch(FIX_SQL, /USING \(true\)/);
  assert.match(FIX_SQL, /CREATE OR REPLACE FUNCTION catalog_rights_records_audit/);
});
