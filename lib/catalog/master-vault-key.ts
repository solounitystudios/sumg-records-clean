/**
 * Canonical Private Master Vault object-key construction and parsing (pure,
 * deterministic, no I/O). SUMG-CAT-P0-003.
 *
 * The key is built ENTIRELY from server-generated UUIDs plus a
 * server-controlled extension derived from the verified MIME type — never
 * from user-supplied text (title, original filename). There is therefore no
 * path-traversal surface to sanitize: the shape is structural.
 *
 *   masters/<recordingId>/<assetVersionId>/original.<ext>
 *
 * This matches the DB CHECK constraint catalog_asset_versions_vault_ref_shape
 * in supabase/migrations/20260909180000_catalog_a1_work_recording_version_lineage.sql
 * exactly — a row can only ever reference its own canonical key.
 */

export const MASTER_VAULT_BUCKET = "sumg-master-vault";

/** 250 MB — docs/SUMG_MASTER_VAULT_SECURITY_CONTRACT.md §1. */
export const MASTER_VAULT_MAX_BYTES = 262_144_000;

/** Short-TTL admin review/playback reads. */
export const MASTER_VAULT_SIGNED_READ_TTL_SECONDS = 300;

/** Longer window to tolerate slow connections on large master files. */
export const MASTER_VAULT_SIGNED_UPLOAD_TTL_SECONDS = 1_800;

/**
 * Accepted master containers. `audio/mpeg` is accepted but is flagged
 * non-master-quality by the UI — it is not rejected outright because a lossy
 * file is sometimes the only surviving copy of a work.
 */
export const MASTER_VAULT_ACCEPTED_MIME: Readonly<Record<string, string>> = Object.freeze({
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/aiff": "aiff",
  "audio/x-aiff": "aiff",
  "audio/mpeg": "mp3",
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^masters\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/original\.(wav|flac|aiff|aif|mp3)$/i;

export class UnsupportedMasterMimeError extends Error {
  constructor(mimeType: string) {
    super(`"${mimeType}" is not an accepted Master Vault MIME type`);
    this.name = "UnsupportedMasterMimeError";
  }
}

export class InvalidMasterVaultKeyError extends Error {
  constructor(value: string, reason: string) {
    super(`"${value}" is not a valid Master Vault object key: ${reason}`);
    this.name = "InvalidMasterVaultKeyError";
  }
}

/** Server-controlled extension for a verified MIME type. Throws on anything not in the allowlist. */
export function extensionForMime(mimeType: string): string {
  const ext = MASTER_VAULT_ACCEPTED_MIME[mimeType.toLowerCase().trim()];
  if (!ext) throw new UnsupportedMasterMimeError(mimeType);
  return ext;
}

export function isAcceptedMasterMime(mimeType: string): boolean {
  return mimeType.toLowerCase().trim() in MASTER_VAULT_ACCEPTED_MIME;
}

export interface MasterVaultKeyParts {
  recordingId: string;
  assetVersionId: string;
  ext: string;
}

/**
 * Build the canonical key. Both ids MUST be real UUIDs (they come from
 * committed DB rows); `mimeType` MUST be in the allowlist.
 */
export function buildMasterVaultKey(recordingId: string, assetVersionId: string, mimeType: string): string {
  if (!UUID_RE.test(recordingId)) {
    throw new InvalidMasterVaultKeyError(recordingId, "recordingId is not a UUID");
  }
  if (!UUID_RE.test(assetVersionId)) {
    throw new InvalidMasterVaultKeyError(assetVersionId, "assetVersionId is not a UUID");
  }
  return `masters/${recordingId}/${assetVersionId}/original.${extensionForMime(mimeType)}`;
}

/** Parse a key back to its parts. Throws if the shape is wrong. */
export function parseMasterVaultKey(key: string): MasterVaultKeyParts {
  const m = KEY_RE.exec(key);
  if (!m) throw new InvalidMasterVaultKeyError(key, "does not match masters/<uuid>/<uuid>/original.<ext>");
  const [, recordingId, assetVersionId, ext] = m;
  if (!UUID_RE.test(recordingId) || !UUID_RE.test(assetVersionId)) {
    throw new InvalidMasterVaultKeyError(key, "a path segment is not a UUID");
  }
  return { recordingId, assetVersionId, ext: ext.toLowerCase() };
}

/** True only if `key` is this exact asset version's own canonical key. */
export function keyBelongsToVersion(key: string, recordingId: string, assetVersionId: string): boolean {
  try {
    const parts = parseMasterVaultKey(key);
    return parts.recordingId === recordingId && parts.assetVersionId === assetVersionId;
  } catch {
    return false;
  }
}

/** A public/CDN-style URL must never be persisted as a vault ref. */
export function isPublicUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.includes("/storage/v1/object/public/");
}
