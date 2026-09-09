import { createHash } from "node:crypto";

/**
 * Provider-neutral Private Master Vault interface (Part 11). No bucket is
 * created and no object is written by this pass — see
 * docs/SUMG_CATALOG_PERSISTENCE_AUDIT.md §4. `assets` / `sumg-assets` remain
 * the public-media system, unchanged; a real implementation of this interface
 * would point at a new, separate, private-by-default bucket.
 */

export interface VaultObjectMetadata {
  objectRef: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
}

export interface PutObjectInput {
  bytes: Uint8Array;
  mimeType: string;
  /** Maximum allowed size in bytes; putOriginal/putDerivative reject anything larger. */
  maxSizeBytes?: number;
}

export interface SignedReadUrl {
  /** Not a permanent public URL — always time-limited, never persisted as-is. */
  url: string;
  expiresAt: string;
}

export interface MasterVault {
  putOriginal(objectRef: string, input: PutObjectInput): Promise<VaultObjectMetadata>;
  putDerivative(objectRef: string, parentObjectRef: string, input: PutObjectInput): Promise<VaultObjectMetadata>;
  getSignedReadUrl(objectRef: string, ttlSeconds: number): Promise<SignedReadUrl>;
  verifyObject(objectRef: string, expectedSha256: string): Promise<boolean>;
  exists(objectRef: string): Promise<boolean>;
  archive(objectRef: string): Promise<void>;
  getObjectMetadata(objectRef: string): Promise<VaultObjectMetadata | null>;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export class VaultObjectTooLargeError extends Error {
  constructor(objectRef: string, sizeBytes: number, maxSizeBytes: number) {
    super(`Object "${objectRef}" is ${sizeBytes} bytes, exceeding the ${maxSizeBytes}-byte limit`);
    this.name = "VaultObjectTooLargeError";
  }
}

/**
 * Deterministic in-memory implementation used only for tests. It is never
 * wired to real Supabase Storage or any other provider, has no credentials,
 * and every "URL" it issues is a synthetic signed token string — not a real
 * network-reachable location. This satisfies "deterministic tests" (Part 34)
 * without performing any production storage mutation (Part 33).
 *
 * `clock` is an explicit dependency, not a hidden `new Date()` — the same
 * sequence of calls against the same injected clock always produces the same
 * `createdAt`/`expiresAt` values. Defaults to the real clock only for
 * convenience outside of determinism-sensitive tests; pass a fixed clock to
 * get reproducible output.
 */
export function createInMemoryMasterVault(opts?: { clock?: () => Date }): MasterVault {
  const clock = opts?.clock ?? (() => new Date());
  const store = new Map<string, { bytes: Uint8Array; metadata: VaultObjectMetadata; archived: boolean }>();
  const parents = new Map<string, string>();

  function put(objectRef: string, input: PutObjectInput): VaultObjectMetadata {
    if (input.maxSizeBytes !== undefined && input.bytes.byteLength > input.maxSizeBytes) {
      throw new VaultObjectTooLargeError(objectRef, input.bytes.byteLength, input.maxSizeBytes);
    }
    const metadata: VaultObjectMetadata = {
      objectRef,
      sha256: sha256Hex(input.bytes),
      sizeBytes: input.bytes.byteLength,
      mimeType: input.mimeType,
      createdAt: clock().toISOString(),
    };
    store.set(objectRef, { bytes: input.bytes, metadata, archived: false });
    return metadata;
  }

  return {
    async putOriginal(objectRef, input) {
      return put(objectRef, input);
    },
    async putDerivative(objectRef, parentObjectRef, input) {
      if (!store.has(parentObjectRef)) {
        throw new Error(`Cannot create derivative "${objectRef}": parent "${parentObjectRef}" does not exist in the vault`);
      }
      parents.set(objectRef, parentObjectRef);
      return put(objectRef, input);
    },
    async getSignedReadUrl(objectRef, ttlSeconds) {
      if (!store.has(objectRef)) throw new Error(`Object "${objectRef}" does not exist`);
      const expiresAt = new Date(clock().getTime() + ttlSeconds * 1000).toISOString();
      // Synthetic, opaque token — never a public/static URL, no credential embedded.
      return { url: `vault://signed/${objectRef}?exp=${encodeURIComponent(expiresAt)}`, expiresAt };
    },
    async verifyObject(objectRef, expectedSha256) {
      const entry = store.get(objectRef);
      if (!entry) return false;
      return entry.metadata.sha256 === expectedSha256;
    },
    async exists(objectRef) {
      return store.has(objectRef);
    },
    async archive(objectRef) {
      const entry = store.get(objectRef);
      if (!entry) throw new Error(`Object "${objectRef}" does not exist`);
      entry.archived = true;
    },
    async getObjectMetadata(objectRef) {
      return store.get(objectRef)?.metadata ?? null;
    },
  };
}
