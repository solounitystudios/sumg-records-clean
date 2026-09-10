import { test } from "node:test";
import assert from "node:assert/strict";
import { createInMemoryMasterVault, sha256Hex, VaultObjectExistsError, VaultObjectTooLargeError } from "./vault";

const FIXED_CLOCK = () => new Date("2026-01-01T00:00:00.000Z");

test("putOriginal computes sha256 deterministically", async () => {
  const vault = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  const bytes = new TextEncoder().encode("hello master");
  const meta = await vault.putOriginal("obj-1", { bytes, mimeType: "audio/wav" });
  assert.equal(meta.sha256, sha256Hex(bytes));
  assert.equal(meta.sizeBytes, bytes.byteLength);
});

test("verifyObject confirms a matching hash and rejects a mismatched one", async () => {
  const vault = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  const bytes = new TextEncoder().encode("hello master");
  const meta = await vault.putOriginal("obj-1", { bytes, mimeType: "audio/wav" });
  assert.equal(await vault.verifyObject("obj-1", meta.sha256), true);
  assert.equal(await vault.verifyObject("obj-1", "wrong-hash"), false);
});

test("putOriginal rejects an object over the configured size limit", async () => {
  const vault = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  const bytes = new Uint8Array(100);
  await assert.rejects(() => vault.putOriginal("obj-2", { bytes, mimeType: "audio/wav", maxSizeBytes: 10 }), VaultObjectTooLargeError);
});

test("putOriginal never silently overwrites an existing object — replacement is a new version", async () => {
  const vault = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  const bytes = new TextEncoder().encode("hello master");
  await vault.putOriginal("obj-1", { bytes, mimeType: "audio/wav" });
  await assert.rejects(
    () => vault.putOriginal("obj-1", { bytes: new TextEncoder().encode("different"), mimeType: "audio/wav" }),
    VaultObjectExistsError,
  );
});

test("putDerivative requires the parent object to already exist", async () => {
  const vault = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  const bytes = new TextEncoder().encode("derivative");
  await assert.rejects(() => vault.putDerivative("obj-child", "obj-missing-parent", { bytes, mimeType: "audio/wav" }));
});

test("getSignedReadUrl never returns a static public URL — it is time-limited and object-specific", async () => {
  const vault = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  const bytes = new TextEncoder().encode("hello master");
  await vault.putOriginal("obj-1", { bytes, mimeType: "audio/wav" });
  const signed = await vault.getSignedReadUrl("obj-1", 60);
  assert.match(signed.url, /^vault:\/\/signed\/obj-1\?exp=/);
  assert.equal(signed.expiresAt, "2026-01-01T00:01:00.000Z");
});

test("no vault object metadata ever contains a credential-shaped field", async () => {
  const vault = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  const bytes = new TextEncoder().encode("hello master");
  const meta = await vault.putOriginal("obj-1", { bytes, mimeType: "audio/wav" });
  const serialized = JSON.stringify(meta).toLowerCase();
  for (const forbidden of ["password", "secret", "token", "credential", "apikey"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("exists reflects vault state accurately", async () => {
  const vault = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  assert.equal(await vault.exists("obj-1"), false);
  await vault.putOriginal("obj-1", { bytes: new Uint8Array([1, 2, 3]), mimeType: "audio/wav" });
  assert.equal(await vault.exists("obj-1"), true);
});

test("same input and same injected clock produce the same output across independent vault instances", async () => {
  const bytes = new TextEncoder().encode("deterministic payload");
  const vaultA = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  const vaultB = createInMemoryMasterVault({ clock: FIXED_CLOCK });
  const metaA = await vaultA.putOriginal("obj-1", { bytes, mimeType: "audio/wav" });
  const metaB = await vaultB.putOriginal("obj-1", { bytes, mimeType: "audio/wav" });
  assert.deepEqual(metaA, metaB);
  const signedA = await vaultA.getSignedReadUrl("obj-1", 30);
  const signedB = await vaultB.getSignedReadUrl("obj-1", 30);
  assert.deepEqual(signedA, signedB);
});
