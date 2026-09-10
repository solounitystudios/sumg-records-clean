import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMasterVaultKey,
  extensionForMime,
  InvalidMasterVaultKeyError,
  isAcceptedMasterMime,
  isPublicUrl,
  keyBelongsToVersion,
  MASTER_VAULT_ACCEPTED_MIME,
  MASTER_VAULT_BUCKET,
  MASTER_VAULT_MAX_BYTES,
  parseMasterVaultKey,
  UnsupportedMasterMimeError,
} from "./master-vault-key";

const REC = "11111111-1111-4111-8111-111111111111";
const VER = "22222222-2222-4222-8222-222222222222";

test("bucket + limit constants match the security contract", () => {
  assert.equal(MASTER_VAULT_BUCKET, "sumg-master-vault");
  assert.equal(MASTER_VAULT_MAX_BYTES, 250 * 1024 * 1024);
});

test("buildMasterVaultKey uses only UUIDs and a server-derived extension — never user text", () => {
  assert.equal(buildMasterVaultKey(REC, VER, "audio/wav"), `masters/${REC}/${VER}/original.wav`);
  assert.equal(buildMasterVaultKey(REC, VER, "audio/flac"), `masters/${REC}/${VER}/original.flac`);
  assert.equal(buildMasterVaultKey(REC, VER, "audio/x-aiff"), `masters/${REC}/${VER}/original.aiff`);
  assert.equal(buildMasterVaultKey(REC, VER, "audio/mpeg"), `masters/${REC}/${VER}/original.mp3`);
});

test("buildMasterVaultKey rejects a non-UUID id (no user-controlled path segment)", () => {
  assert.throws(() => buildMasterVaultKey("../etc/passwd", VER, "audio/wav"), InvalidMasterVaultKeyError);
  assert.throws(() => buildMasterVaultKey(REC, "not-a-uuid", "audio/wav"), InvalidMasterVaultKeyError);
});

test("buildMasterVaultKey rejects a MIME type outside the allowlist", () => {
  assert.throws(() => buildMasterVaultKey(REC, VER, "audio/ogg"), UnsupportedMasterMimeError);
  assert.throws(() => buildMasterVaultKey(REC, VER, "application/octet-stream"), UnsupportedMasterMimeError);
  assert.throws(() => buildMasterVaultKey(REC, VER, "image/png"), UnsupportedMasterMimeError);
});

test("parseMasterVaultKey round-trips a built key", () => {
  const key = buildMasterVaultKey(REC, VER, "audio/wav");
  assert.deepEqual(parseMasterVaultKey(key), { recordingId: REC, assetVersionId: VER, ext: "wav" });
});

test("parseMasterVaultKey rejects a traversal / wrong-shape key", () => {
  assert.throws(() => parseMasterVaultKey("masters/../../secret"), InvalidMasterVaultKeyError);
  assert.throws(() => parseMasterVaultKey(`masters/${REC}/${VER}/original.exe`), InvalidMasterVaultKeyError);
  assert.throws(() => parseMasterVaultKey(`other/${REC}/${VER}/original.wav`), InvalidMasterVaultKeyError);
  assert.throws(() => parseMasterVaultKey(`masters/${REC}/${VER}/renamed.wav`), InvalidMasterVaultKeyError);
});

test("keyBelongsToVersion is true only for that version's own canonical key", () => {
  const key = buildMasterVaultKey(REC, VER, "audio/wav");
  assert.equal(keyBelongsToVersion(key, REC, VER), true);
  assert.equal(keyBelongsToVersion(key, REC, "33333333-3333-4333-8333-333333333333"), false);
  assert.equal(keyBelongsToVersion(key, "44444444-4444-4444-8444-444444444444", VER), false);
  assert.equal(keyBelongsToVersion("garbage", REC, VER), false);
});

test("extensionForMime / isAcceptedMasterMime are case- and whitespace-tolerant", () => {
  assert.equal(extensionForMime("  AUDIO/WAV "), "wav");
  assert.equal(isAcceptedMasterMime("Audio/Flac"), true);
  assert.equal(isAcceptedMasterMime("audio/ogg"), false);
});

test("every value in the MIME allowlist maps to a lowercase extension the DB regex accepts", () => {
  const dbExts = new Set(["wav", "flac", "aiff", "aif", "mp3"]);
  for (const ext of Object.values(MASTER_VAULT_ACCEPTED_MIME)) {
    assert.equal(dbExts.has(ext), true, `extension "${ext}" is not in the DB CHECK regex`);
  }
});

test("isPublicUrl flags anything that would leak a master via a static/CDN link", () => {
  assert.equal(isPublicUrl("https://x.supabase.co/storage/v1/object/public/sumg-assets/a.wav"), true);
  assert.equal(isPublicUrl("http://example.com/a.wav"), true);
  assert.equal(isPublicUrl(`masters/${REC}/${VER}/original.wav`), false);
});
