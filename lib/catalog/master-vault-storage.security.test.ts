import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MASTER_VAULT_ACCEPTED_MIME, MASTER_VAULT_BUCKET, MASTER_VAULT_MAX_BYTES } from "./master-vault-key";

/**
 * SUMG-CAT-P0-003 — structural checks on the Master Vault Storage migration.
 * The non-negotiable properties from docs/SUMG_MASTER_VAULT_SECURITY_CONTRACT.md
 * §1 must be literally present in the SQL.
 */

const SQL = readFileSync(
  join(__dirname, "..", "..", "supabase", "migrations", "20260909180100_catalog_master_vault_storage.sql"),
  "utf8",
);

test("creates the sumg-master-vault bucket as PRIVATE (public = false)", () => {
  assert.match(SQL, /INSERT INTO storage\.buckets \(id, name, public, file_size_limit, allowed_mime_types\)/);
  assert.match(SQL, /'sumg-master-vault',\s*\n\s*'sumg-master-vault',\s*\n\s*false,/);
  // the ON CONFLICT path must also force private
  assert.match(SQL, /ON CONFLICT \(id\) DO UPDATE SET\s*\n\s*public\s*=\s*false/);
  assert.doesNotMatch(SQL, /'sumg-master-vault',\s*\n\s*'sumg-master-vault',\s*\n\s*true/);
});

test("bucket id matches the code constant", () => {
  assert.equal(MASTER_VAULT_BUCKET, "sumg-master-vault");
  assert.match(SQL, new RegExp(`'${MASTER_VAULT_BUCKET}'`));
});

test("size limit is 250MB and matches the code constant", () => {
  assert.match(SQL, /262144000/);
  assert.equal(MASTER_VAULT_MAX_BYTES, 262144000);
});

test("MIME allowlist is master-audio only and covers every value the code will send", () => {
  for (const mime of Object.keys(MASTER_VAULT_ACCEPTED_MIME)) {
    assert.match(SQL, new RegExp(`'${mime.replace("/", "\\/")}'`), `bucket must allow ${mime}`);
  }
  // no image/video/document/wildcard sneaking in
  assert.doesNotMatch(SQL, /'image\//);
  assert.doesNotMatch(SQL, /'video\//);
  assert.doesNotMatch(SQL, /'\*\/\*'/);
});

test("exactly a CMS-gated read policy and a CMS-gated write policy — scoped to this bucket", () => {
  assert.match(SQL, /CREATE POLICY "master vault cms read"\s+ON storage\.objects FOR SELECT\s+USING \(bucket_id = 'sumg-master-vault' AND public\.is_cms_role\(\)\)/);
  assert.match(SQL, /CREATE POLICY "master vault cms write"\s+ON storage\.objects FOR INSERT\s+WITH CHECK \(bucket_id = 'sumg-master-vault' AND public\.is_cms_role\(\)\)/);
});

test("NO update policy and NO delete policy for the vault bucket (no overwrite, no deletion path)", () => {
  // there must be no CREATE POLICY ... FOR UPDATE / FOR DELETE anywhere in this migration
  assert.doesNotMatch(SQL, /CREATE POLICY[^;]*FOR UPDATE/i);
  assert.doesNotMatch(SQL, /CREATE POLICY[^;]*FOR DELETE/i);
});

test("no public read, no anon role, no USING(true) on storage.objects", () => {
  assert.doesNotMatch(SQL, /USING \(true\)/);
  assert.doesNotMatch(SQL, /TO anon/i);
  assert.doesNotMatch(SQL, /getPublicUrl/);
  assert.doesNotMatch(SQL, /object\/public/);
});

test("does not touch the existing music / sumg-assets buckets", () => {
  assert.doesNotMatch(SQL, /'sumg-assets'/);
  assert.doesNotMatch(SQL, /UPDATE storage\.buckets[^;]*WHERE id = 'music'/);
  assert.doesNotMatch(SQL, /'music'/);
});

test("is idempotent — DROP POLICY IF EXISTS before CREATE, ON CONFLICT on the bucket insert", () => {
  assert.match(SQL, /DROP POLICY IF EXISTS "master vault cms read"\s+ON storage\.objects/);
  assert.match(SQL, /DROP POLICY IF EXISTS "master vault cms write"\s+ON storage\.objects/);
  assert.match(SQL, /ON CONFLICT \(id\) DO UPDATE SET/);
});
