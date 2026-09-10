import { createHash } from "node:crypto"
import { supabase } from "./supabase"
import {
  sha256Hex,
  VaultObjectExistsError,
  VaultObjectTooLargeError,
  type MasterVaultDirectUpload,
  type PutObjectInput,
  type SignedReadUrl,
  type SignedUploadUrl,
  type VaultObjectMetadata,
  type VaultObjectProbe,
} from "@/lib/catalog/vault"
import {
  MASTER_VAULT_BUCKET,
  MASTER_VAULT_MAX_BYTES,
  MASTER_VAULT_SIGNED_UPLOAD_TTL_SECONDS,
  isAcceptedMasterMime,
  isPublicUrl,
  parseMasterVaultKey,
  UnsupportedMasterMimeError,
} from "@/lib/catalog/master-vault-key"

/**
 * Real Supabase-Storage-backed Private Master Vault (SUMG-CAT-P0-003),
 * implementing lib/catalog/vault.ts's MasterVaultDirectUpload interface
 * against the `sumg-master-vault` bucket created by
 * supabase/migrations/20260909180100_catalog_master_vault_storage.sql.
 *
 * IMPORTANT: that migration is NOT applied to production yet — every method
 * here fails with a Storage error until a founder applies it and the bucket
 * exists. Nothing in this pass calls these methods from a route/page/action;
 * the adapter exists so it is ready and reviewable the moment the bucket
 * lands. Server-side only — it uses the service-role client
 * (lib/db/supabase.ts), which is never shipped to a browser bundle.
 *
 * V1 path is server-proxied (putOriginal): the app server holds the bytes,
 * hashes them, and uploads them. `createSignedUploadUrl` is also implemented
 * for the future direct-browser-upload path but is not the V1 proof path.
 */

export class MasterVaultOperationNotSupportedError extends Error {
  constructor(operation: string) {
    super(
      `Master Vault operation "${operation}" is not supported in V1 — see docs/SUMG_MASTER_VAULT_SECURITY_CONTRACT.md §1 (no deletion/overwrite path exists by design)`,
    )
    this.name = "MasterVaultOperationNotSupportedError"
  }
}

export class MasterVaultStorageError extends Error {
  constructor(operation: string, detail: string) {
    super(`Master Vault ${operation} failed: ${detail}`)
    this.name = "MasterVaultStorageError"
  }
}

function assertValidRef(objectRef: string): void {
  if (isPublicUrl(objectRef)) {
    throw new MasterVaultStorageError("ref check", `"${objectRef}" looks like a public URL — refs are bucket-relative keys only`)
  }
  // Throws InvalidMasterVaultKeyError if the shape is wrong.
  parseMasterVaultKey(objectRef)
}

function assertAcceptedMime(mimeType: string): void {
  if (!isAcceptedMasterMime(mimeType)) throw new UnsupportedMasterMimeError(mimeType)
}

function splitRef(objectRef: string): { dir: string; base: string } {
  const idx = objectRef.lastIndexOf("/")
  return { dir: objectRef.slice(0, idx), base: objectRef.slice(idx + 1) }
}

const vaultBucket = () => supabase.storage.from(MASTER_VAULT_BUCKET)

async function objectExists(objectRef: string): Promise<VaultObjectProbe | null> {
  const { dir, base } = splitRef(objectRef)
  const { data, error } = await vaultBucket().list(dir, { limit: 100, search: base })
  if (error) throw new MasterVaultStorageError("exists", error.message)
  const hit = (data ?? []).find((f) => f.name === base)
  if (!hit) return null
  const meta = (hit.metadata ?? {}) as { size?: number; mimetype?: string }
  return {
    objectRef,
    sizeBytes: typeof meta.size === "number" ? meta.size : 0,
    mimeType: meta.mimetype ?? null,
    createdAt: hit.created_at ?? null,
  }
}

async function downloadAndHash(objectRef: string): Promise<{ sha256: string; sizeBytes: number } | null> {
  const { data, error } = await vaultBucket().download(objectRef)
  if (error) {
    // "Object not found" is a legitimate null, not a throw.
    if (/not.*found/i.test(error.message)) return null
    throw new MasterVaultStorageError("download", error.message)
  }
  if (!data) return null
  const buf = Buffer.from(await data.arrayBuffer())
  return { sha256: createHash("sha256").update(buf).digest("hex"), sizeBytes: buf.byteLength }
}

async function put(objectRef: string, input: PutObjectInput): Promise<VaultObjectMetadata> {
  assertValidRef(objectRef)
  assertAcceptedMime(input.mimeType)

  const sizeBytes = input.bytes.byteLength
  const limit = input.maxSizeBytes ?? MASTER_VAULT_MAX_BYTES
  if (sizeBytes > limit) throw new VaultObjectTooLargeError(objectRef, sizeBytes, limit)

  if (await objectExists(objectRef)) throw new VaultObjectExistsError(objectRef)

  const sha256 = sha256Hex(input.bytes)

  const { error } = await vaultBucket().upload(objectRef, Buffer.from(input.bytes), {
    contentType: input.mimeType,
    upsert: false, // never overwrite — belt-and-braces with the missing UPDATE policy
  })
  if (error) throw new MasterVaultStorageError("upload", error.message)

  // Confirm it landed and cross-check the storage-reported size.
  const probe = await objectExists(objectRef)
  if (!probe) throw new MasterVaultStorageError("upload", "object not visible immediately after upload")
  if (probe.sizeBytes !== 0 && probe.sizeBytes !== sizeBytes) {
    throw new MasterVaultStorageError("upload", `size mismatch: sent ${sizeBytes}, storage reports ${probe.sizeBytes}`)
  }

  return { objectRef, sha256, sizeBytes, mimeType: input.mimeType, createdAt: new Date().toISOString() }
}

export function createSupabaseMasterVault(): MasterVaultDirectUpload {
  return {
    async putOriginal(objectRef, input) {
      return put(objectRef, input)
    },

    async putDerivative(objectRef, parentObjectRef, input) {
      assertValidRef(parentObjectRef)
      if (!(await objectExists(parentObjectRef))) {
        throw new MasterVaultStorageError(
          "putDerivative",
          `parent "${parentObjectRef}" does not exist in the vault`,
        )
      }
      return put(objectRef, input)
    },

    async getSignedReadUrl(objectRef, ttlSeconds): Promise<SignedReadUrl> {
      assertValidRef(objectRef)
      const { data, error } = await vaultBucket().createSignedUrl(objectRef, ttlSeconds)
      if (error || !data?.signedUrl) {
        throw new MasterVaultStorageError("getSignedReadUrl", error?.message ?? "no signed URL returned")
      }
      if (isPublicUrl(data.signedUrl) && data.signedUrl.includes("/object/public/")) {
        throw new MasterVaultStorageError("getSignedReadUrl", "provider returned a public object URL for a private bucket")
      }
      return { url: data.signedUrl, expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString() }
    },

    async createSignedUploadUrl(objectRef, ttlSeconds): Promise<SignedUploadUrl> {
      assertValidRef(objectRef)
      if (await objectExists(objectRef)) throw new VaultObjectExistsError(objectRef)
      const { data, error } = await vaultBucket().createSignedUploadUrl(objectRef)
      if (error || !data?.signedUrl) {
        throw new MasterVaultStorageError("createSignedUploadUrl", error?.message ?? "no signed upload URL returned")
      }
      // Supabase fixes the upload-URL lifetime provider-side (~2h); ttlSeconds
      // is the product intent, reported for the caller's bookkeeping.
      const effectiveTtl = Math.min(ttlSeconds, MASTER_VAULT_SIGNED_UPLOAD_TTL_SECONDS)
      return {
        url: data.signedUrl,
        token: data.token ?? null,
        objectRef,
        expiresAt: new Date(Date.now() + effectiveTtl * 1000).toISOString(),
      }
    },

    async probeObject(objectRef) {
      assertValidRef(objectRef)
      return objectExists(objectRef)
    },

    async verifyObject(objectRef, expectedSha256) {
      assertValidRef(objectRef)
      const result = await downloadAndHash(objectRef)
      if (!result) return false
      return result.sha256 === expectedSha256
    },

    async exists(objectRef) {
      assertValidRef(objectRef)
      return (await objectExists(objectRef)) !== null
    },

    async archive() {
      throw new MasterVaultOperationNotSupportedError("archive")
    },

    async getObjectMetadata(objectRef) {
      assertValidRef(objectRef)
      const probe = await objectExists(objectRef)
      if (!probe) return null
      const hashed = await downloadAndHash(objectRef)
      if (!hashed) return null
      return {
        objectRef,
        sha256: hashed.sha256,
        sizeBytes: hashed.sizeBytes,
        mimeType: probe.mimeType ?? "application/octet-stream",
        createdAt: probe.createdAt ?? new Date().toISOString(),
      }
    },
  }
}
