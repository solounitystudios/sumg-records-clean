import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * SUMG-CAT-P0-003 FIX 1 — structural regression for the Supabase A1 adapter
 * (lib/db/catalogAssets.ts). The in-memory store's behaviour is unit-tested
 * in asset-store.test.ts; the real adapter needs a database to execute, so
 * this locks the mismatch-handling SHAPE of its source so it cannot regress
 * to "a hash mismatch becomes verified".
 */

// __dirname is .test-build/catalog at run time; ../../ is the repo root.
const SRC = readFileSync(join(__dirname, "..", "..", "lib", "db", "catalogAssets.ts"), "utf8");

// Isolate the recordVerification method body.
const REC = (() => {
  const start = SRC.indexOf("async recordVerification(");
  assert.ok(start >= 0, "recordVerification not found");
  const end = SRC.indexOf("\n    },", start);
  assert.ok(end > start, "recordVerification end not found");
  return SRC.slice(start, end);
})();

test("recordVerification derives `mismatch` only from a PRESENT client hash that differs", () => {
  assert.match(
    REC,
    /const mismatch\s*=\s*before\.clientSha256 !== null && before\.clientSha256 !== input\.verifiedSha256/,
  );
});

test("upload_status becomes verification_failed on mismatch, verified only otherwise", () => {
  assert.match(REC, /upload_status:\s*mismatch\s*\?\s*"verification_failed"\s*:\s*"verified"/);
});

test("verified_sha256 is written on BOTH paths; client_sha256 is never written as a column by recordVerification", () => {
  assert.match(REC, /verified_sha256:\s*input\.verifiedSha256/);
  // no `client_sha256:` object-property (i.e. no column write); the only
  // permitted mention is inside the job's last_error_detail template string.
  assert.doesNotMatch(REC, /client_sha256\s*:/);
});

test("the verification job goes to 'failed' with last_error_code 'hash_mismatch' on mismatch, 'completed' otherwise", () => {
  assert.match(REC, /status:\s*"failed"[\s\S]*?last_error_code:\s*"hash_mismatch"/);
  assert.match(REC, /:\s*\{\s*status:\s*"completed",\s*completed_at/);
});

test("on mismatch: emits hash_mismatch + verification_failed and RETURNS before the success events", () => {
  const mismatchBranch = REC.slice(REC.indexOf("if (mismatch) {"));
  assert.match(mismatchBranch, /action:\s*"hash_mismatch"/);
  assert.match(mismatchBranch, /action:\s*"verification_failed"/);
  // the branch returns `after` before reaching the success events
  const returnIdx = mismatchBranch.indexOf("return after");
  const passedIdx = mismatchBranch.indexOf('action: "verification_passed"');
  assert.ok(returnIdx > 0, "mismatch branch must return early");
  assert.ok(passedIdx === -1 || returnIdx < passedIdx, "verification_passed must not be reachable on the mismatch path");
});

test("on mismatch: opens a hash_mismatch review flag (severity blocked), tolerating 23505 (already open)", () => {
  const mismatchBranch = REC.slice(REC.indexOf("if (mismatch) {"));
  assert.match(mismatchBranch, /\.from\("catalog_review_flags"\)\s*\.insert\(\{[\s\S]*?reason_code:\s*"hash_mismatch"/);
  assert.match(mismatchBranch, /severity:\s*"blocked"/);
  assert.match(mismatchBranch, /flagErr\.code !== "23505"/);
});

test("success path still emits hash_verified + verification_passed", () => {
  assert.match(REC, /action:\s*"hash_verified"/);
  assert.match(REC, /action:\s*"verification_passed"/);
});

test("both emitted mismatch actions are valid catalog_audit_log actions", () => {
  const auditSql = readFileSync(
    join(__dirname, "..", "..", "supabase", "migrations", "20260909100001_catalog_audit_log.sql"),
    "utf8",
  );
  for (const action of ["hash_mismatch", "verification_failed", "hash_verified", "verification_passed"]) {
    assert.match(auditSql, new RegExp(`'${action}'`), `${action} must be in A5's action CHECK`);
  }
});
