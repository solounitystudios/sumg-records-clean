import type {
  AssetReviewStatus,
  AssetVersionKind,
  AssetVersionSource,
  CatalogAssetLineageEdge,
  CatalogAssetState,
  CatalogAssetVersion,
  CatalogRecording,
  CatalogReviewFlag,
  CatalogVerificationJob,
  CatalogWork,
  CatalogWorkStatus,
  ReviewFlagReasonCode,
  ReviewFlagSeverity,
  ReviewFlagSubjectType,
} from "./types";
import { addLineageEdge as addLineageEdgePure } from "./lineage";

/**
 * A1 persistence-facing store contracts (SUMG-CAT-P0-003). Pure — no Supabase
 * import, no network, no hidden clock — matching every other file in
 * lib/catalog/. The real Supabase-backed implementation lives in
 * lib/db/catalogAssets.ts, per the repo's "lib/catalog = pure logic,
 * lib/db = persistence" split (the same split A2's rights-store.ts /
 * lib/db/catalogRights.ts already follow).
 */

// ─── Audit sink (A5 actor model) ──────────────────────────────────────────

export type CatalogActorType = "human" | "service" | "worker" | "ai" | "system";

export interface CatalogAuditEvent {
  action: string;
  actorType: CatalogActorType;
  /** A real auth.users UUID, or null. Never a placeholder string. */
  actor: string | null;
  actorLabel: string;
  objectType: string;
  objectId: string;
  previousState: unknown;
  newState: unknown;
  source: string | null;
  occurredAt: string;
}

export class AuditActorShapeError extends Error {
  constructor(detail: string) {
    super(`Audit event violates A5's actor model: ${detail}`);
    this.name = "AuditActorShapeError";
  }
}

/**
 * The one A5 invariant every audit writer must satisfy
 * (catalog_audit_log_no_human_spoof): a non-null `actor` UUID is only ever
 * paired with actor_type 'human'. Also forbids an empty actor_label
 * (catalog_audit_log.actor_label is NOT NULL and meaningless when blank).
 */
export function assertAuditActorShape(event: CatalogAuditEvent): void {
  if (event.actor !== null && event.actorType !== "human") {
    throw new AuditActorShapeError(
      `actor_type '${event.actorType}' carries a non-null actor UUID (only 'human' may)`,
    );
  }
  if (event.actorLabel.trim() === "") {
    throw new AuditActorShapeError("actor_label is empty");
  }
}

export interface CatalogAuditSink {
  record(event: CatalogAuditEvent): Promise<void>;
}

export function createInMemoryAuditSink(): CatalogAuditSink & { events: CatalogAuditEvent[] } {
  const events: CatalogAuditEvent[] = [];
  return {
    events,
    async record(event) {
      assertAuditActorShape(event);
      events.push(event);
    },
  };
}

// ─── Write inputs ─────────────────────────────────────────────────────────

export interface CreateWorkInput {
  title: string;
  songId: string | null;
  createdBy: string | null;
  status?: CatalogWorkStatus;
}

export interface CreateRecordingInput {
  workId: string;
  artistSlug: string | null;
}

export interface CreateAssetVersionInput {
  recordingId: string;
  versionKind: AssetVersionKind;
  source: AssetVersionSource;
  uploadedBy: string | null;
  clientSha256?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  durationSeconds?: number | null;
  technicalMetadata?: Record<string, unknown>;
  isPrimary?: boolean;
  idempotencyKey?: string | null;
}

export interface AttachVaultObjectInput {
  assetVersionId: string;
  vaultObjectRef: string;
  /** The hash the client claimed at upload time, if it wasn't set at creation. */
  clientSha256?: string | null;
  sizeBytes?: number | null;
  mimeType?: string | null;
  /** Who performed the upload — for the audit event. */
  actor: string | null;
}

export interface RecordVerificationInput {
  assetVersionId: string;
  verifiedSha256: string;
  technicalMetadata?: Record<string, unknown>;
  durationSeconds?: number | null;
  /** Worker instance identity — free text, never an auth.users UUID. */
  workerLabel: string;
}

export interface FailVerificationInput {
  assetVersionId: string;
  errorCode: string;
  errorDetail: string;
  workerLabel: string;
}

export interface SetReviewStatusInput {
  assetVersionId: string;
  status: AssetReviewStatus;
  reviewedBy: string;
}

export interface AddLineageEdgeInput {
  childAssetVersionId: string;
  parentAssetVersionId: string;
  derivationType: string;
  createdBy: string | null;
}

export interface AddReviewFlagInput {
  subjectType: ReviewFlagSubjectType;
  subjectId: string;
  reasonCode: ReviewFlagReasonCode;
  severity: ReviewFlagSeverity;
  detail: string | null;
}

export interface ResolveReviewFlagInput {
  flagId: string;
  resolvedBy: string;
  resolution: string;
}

// ─── Store contract ──────────────────────────────────────────────────────

export interface AssetCatalogStore {
  createWork(input: CreateWorkInput, now: string): Promise<CatalogWork>;
  createRecording(input: CreateRecordingInput, now: string): Promise<CatalogRecording>;
  createAssetVersion(input: CreateAssetVersionInput, now: string): Promise<CatalogAssetVersion>;
  /** Binds the version to its stored object and moves it to 'uploaded_unverified'. */
  attachVaultObject(input: AttachVaultObjectInput, now: string): Promise<CatalogAssetVersion>;
  /** Sets verified_sha256 and moves to 'verified'. Also completes the verification job. */
  recordVerification(input: RecordVerificationInput, now: string): Promise<CatalogAssetVersion>;
  failVerification(input: FailVerificationInput, now: string): Promise<CatalogAssetVersion>;
  setReviewStatus(input: SetReviewStatusInput, now: string): Promise<CatalogAssetVersion>;
  addLineageEdge(input: AddLineageEdgeInput, now: string): Promise<CatalogAssetLineageEdge>;
  createVerificationJob(assetVersionId: string, now: string): Promise<CatalogVerificationJob>;
  getVerificationJob(assetVersionId: string): Promise<CatalogVerificationJob | null>;
  addReviewFlag(input: AddReviewFlagInput, now: string): Promise<CatalogReviewFlag>;
  resolveReviewFlag(input: ResolveReviewFlagInput, now: string): Promise<CatalogReviewFlag>;
  listReviewFlags(subjectType: ReviewFlagSubjectType, subjectId: string): Promise<CatalogReviewFlag[]>;
  getAssetState(assetVersionId: string): Promise<CatalogAssetState | null>;
}

// ─── Deterministic in-memory implementation (tests only) ──────────────────

export class AssetVersionNotFoundError extends Error {
  constructor(id: string) {
    super(`No catalog_asset_versions row for id "${id}"`);
    this.name = "AssetVersionNotFoundError";
  }
}

export class VaultObjectAlreadyAttachedError extends Error {
  constructor(id: string) {
    super(`Asset version "${id}" already has a vault object attached — replacement is a new version, never an overwrite`);
    this.name = "VaultObjectAlreadyAttachedError";
  }
}

export class DuplicatePrimaryVersionError extends Error {
  constructor(recordingId: string) {
    super(`Recording "${recordingId}" already has a primary asset version`);
    this.name = "DuplicatePrimaryVersionError";
  }
}

export class ReviewFlagAlreadyOpenError extends Error {
  constructor(subjectId: string, reasonCode: string) {
    super(`Subject "${subjectId}" already has an open "${reasonCode}" review flag`);
    this.name = "ReviewFlagAlreadyOpenError";
  }
}

interface InMemoryDeps {
  auditSink?: CatalogAuditSink;
  /** Deterministic id source — defaults to a counter, never a hidden RNG. */
  idFactory?: (kind: string) => string;
}

export function createInMemoryAssetCatalogStore(deps: InMemoryDeps = {}): AssetCatalogStore {
  const audit = deps.auditSink ?? createInMemoryAuditSink();
  let counter = 0;
  const idFactory = deps.idFactory ?? ((kind: string) => `${kind}-${++counter}`);

  const works = new Map<string, CatalogWork>();
  const recordings = new Map<string, CatalogRecording>();
  const versions = new Map<string, CatalogAssetVersion>();
  const lineage: CatalogAssetLineageEdge[] = [];
  const jobs = new Map<string, CatalogVerificationJob>(); // keyed by assetVersionId
  const flags = new Map<string, CatalogReviewFlag>();

  function requireVersion(id: string): CatalogAssetVersion {
    const v = versions.get(id);
    if (!v) throw new AssetVersionNotFoundError(id);
    return v;
  }

  function findOpenFlag(
    subjectType: ReviewFlagSubjectType,
    subjectId: string,
    reasonCode: ReviewFlagReasonCode,
  ): CatalogReviewFlag | undefined {
    return [...flags.values()].find(
      (f) =>
        f.subjectType === subjectType &&
        f.subjectId === subjectId &&
        f.reasonCode === reasonCode &&
        f.status === "open",
    );
  }

  function openFlag(input: AddReviewFlagInput, now: string): CatalogReviewFlag {
    const flag: CatalogReviewFlag = {
      id: idFactory("flag"),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      reasonCode: input.reasonCode,
      severity: input.severity,
      status: "open",
      detail: input.detail,
      createdAt: now,
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
    };
    flags.set(flag.id, flag);
    return flag;
  }

  return {
    async createWork(input, now) {
      const work: CatalogWork = {
        id: idFactory("work"),
        title: input.title,
        songId: input.songId,
        createdBy: input.createdBy,
        status: input.status ?? "intake",
        createdAt: now,
        updatedAt: now,
      };
      works.set(work.id, work);
      return work;
    },

    async createRecording(input, now) {
      if (!works.has(input.workId)) throw new Error(`No catalog_works row for id "${input.workId}"`);
      const recording: CatalogRecording = {
        id: idFactory("recording"),
        workId: input.workId,
        artistSlug: input.artistSlug,
        createdAt: now,
      };
      recordings.set(recording.id, recording);
      return recording;
    },

    async createAssetVersion(input, now) {
      if (!recordings.has(input.recordingId)) {
        throw new Error(`No catalog_recordings row for id "${input.recordingId}"`);
      }
      if (input.isPrimary) {
        for (const v of versions.values()) {
          if (v.recordingId === input.recordingId && v.isPrimary) {
            throw new DuplicatePrimaryVersionError(input.recordingId);
          }
        }
      }
      const version: CatalogAssetVersion = {
        id: idFactory("version"),
        recordingId: input.recordingId,
        versionKind: input.versionKind,
        vaultObjectRef: null,
        clientSha256: input.clientSha256 ?? null,
        verifiedSha256: null,
        sizeBytes: input.sizeBytes ?? null,
        mimeType: input.mimeType ?? null,
        durationSeconds: input.durationSeconds ?? null,
        technicalMetadata: input.technicalMetadata ?? {},
        uploadStatus: "pending_upload",
        reviewStatus: "pending_review",
        source: input.source,
        uploadedBy: input.uploadedBy,
        isPrimary: input.isPrimary ?? false,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt: now,
        updatedAt: now,
      };
      versions.set(version.id, version);
      // Mirrors the DB trigger catalog_asset_versions_intake_audit_trg.
      await audit.record({
        action: "intake_created",
        actorType: version.uploadedBy ? "human" : "system",
        actor: version.uploadedBy,
        actorLabel: version.uploadedBy ?? version.source,
        objectType: "catalog_asset_versions",
        objectId: version.id,
        previousState: null,
        newState: version,
        source: version.source,
        occurredAt: now,
      });
      return version;
    },

    async attachVaultObject(input, now) {
      const v = requireVersion(input.assetVersionId);
      if (v.vaultObjectRef !== null) throw new VaultObjectAlreadyAttachedError(v.id);
      const next: CatalogAssetVersion = {
        ...v,
        vaultObjectRef: input.vaultObjectRef,
        clientSha256: input.clientSha256 ?? v.clientSha256,
        sizeBytes: input.sizeBytes ?? v.sizeBytes,
        mimeType: input.mimeType ?? v.mimeType,
        uploadStatus: "uploaded_unverified",
        updatedAt: now,
      };
      versions.set(v.id, next);
      await audit.record({
        action: "upload_completed",
        actorType: input.actor ? "human" : "system",
        actor: input.actor,
        actorLabel: input.actor ?? next.source,
        objectType: "catalog_asset_versions",
        objectId: v.id,
        previousState: v,
        newState: next,
        source: next.source,
        occurredAt: now,
      });
      return next;
    },

    async createVerificationJob(assetVersionId, now) {
      requireVersion(assetVersionId);
      const existing = jobs.get(assetVersionId);
      if (existing) return existing;
      const job: CatalogVerificationJob = {
        id: idFactory("vjob"),
        assetVersionId,
        status: "pending",
        claimedBy: null,
        claimedAt: null,
        leaseExpiresAt: null,
        attemptCount: 0,
        lastAttemptAt: null,
        lastErrorCode: null,
        lastErrorDetail: null,
        nextAttemptAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      jobs.set(assetVersionId, job);
      return job;
    },

    async getVerificationJob(assetVersionId) {
      return jobs.get(assetVersionId) ?? null;
    },

    async recordVerification(input, now) {
      const v = requireVersion(input.assetVersionId);
      // A hash mismatch is ONLY when the client actually submitted an advisory
      // hash AND the authoritative re-hash of the stored object contradicts it.
      // An absent client_sha256 is not suspicious (schema: "never trusted
      // alone") — there is simply no claim to contradict, so it is a success.
      const mismatch = v.clientSha256 !== null && v.clientSha256 !== input.verifiedSha256;
      const next: CatalogAssetVersion = {
        ...v,
        // verified_sha256 is the authoritative hash of what is actually
        // stored — recorded on BOTH paths, never invented, client_sha256
        // never overwritten.
        verifiedSha256: input.verifiedSha256,
        durationSeconds: input.durationSeconds ?? v.durationSeconds,
        technicalMetadata: input.technicalMetadata ?? v.technicalMetadata,
        uploadStatus: mismatch ? "verification_failed" : "verified",
        updatedAt: now,
      };
      versions.set(v.id, next);

      const job = jobs.get(v.id);
      if (job) {
        jobs.set(
          v.id,
          mismatch
            ? {
                ...job,
                status: "failed",
                attemptCount: job.attemptCount + 1,
                lastAttemptAt: now,
                lastErrorCode: "hash_mismatch",
                lastErrorDetail: `client_sha256=${v.clientSha256} verified_sha256=${input.verifiedSha256}`,
                updatedAt: now,
              }
            : {
                ...job,
                status: "completed",
                completedAt: now,
                attemptCount: job.attemptCount + 1,
                lastAttemptAt: now,
                updatedAt: now,
              },
        );
      }

      if (mismatch) {
        await audit.record({
          action: "hash_mismatch",
          actorType: "worker",
          actor: null,
          actorLabel: input.workerLabel,
          objectType: "catalog_asset_versions",
          objectId: v.id,
          previousState: v,
          newState: next,
          source: "verification_worker",
          occurredAt: now,
        });
        await audit.record({
          action: "verification_failed",
          actorType: "worker",
          actor: null,
          actorLabel: input.workerLabel,
          objectType: "catalog_asset_versions",
          objectId: v.id,
          previousState: v,
          newState: next,
          source: "verification_worker",
          occurredAt: now,
        });
        // Surface it to a human via the existing review-flag model — idempotent
        // (one open hash_mismatch flag per subject, DB-enforced by
        // catalog_review_flags_one_open_per_reason).
        if (!findOpenFlag("asset_version", v.id, "hash_mismatch")) {
          openFlag(
            {
              subjectType: "asset_version",
              subjectId: v.id,
              reasonCode: "hash_mismatch",
              severity: "blocked",
              detail: "authoritative stored-object hash does not match the client-submitted advisory hash",
            },
            now,
          );
        }
        return next;
      }

      await audit.record({
        action: "hash_verified",
        actorType: "worker",
        actor: null,
        actorLabel: input.workerLabel,
        objectType: "catalog_asset_versions",
        objectId: v.id,
        previousState: v,
        newState: next,
        source: "verification_worker",
        occurredAt: now,
      });
      await audit.record({
        action: "verification_passed",
        actorType: "worker",
        actor: null,
        actorLabel: input.workerLabel,
        objectType: "catalog_asset_versions",
        objectId: v.id,
        previousState: v,
        newState: next,
        source: "verification_worker",
        occurredAt: now,
      });
      return next;
    },

    async failVerification(input, now) {
      const v = requireVersion(input.assetVersionId);
      const next: CatalogAssetVersion = { ...v, uploadStatus: "verification_failed", updatedAt: now };
      versions.set(v.id, next);
      const job = jobs.get(v.id);
      if (job) {
        jobs.set(v.id, {
          ...job,
          status: "failed",
          attemptCount: job.attemptCount + 1,
          lastAttemptAt: now,
          lastErrorCode: input.errorCode,
          lastErrorDetail: input.errorDetail,
          updatedAt: now,
        });
      }
      await audit.record({
        action: "verification_failed",
        actorType: "worker",
        actor: null,
        actorLabel: input.workerLabel,
        objectType: "catalog_asset_versions",
        objectId: v.id,
        previousState: v,
        newState: next,
        source: "verification_worker",
        occurredAt: now,
      });
      return next;
    },

    async setReviewStatus(input, now) {
      const v = requireVersion(input.assetVersionId);
      const next: CatalogAssetVersion = { ...v, reviewStatus: input.status, updatedAt: now };
      versions.set(v.id, next);
      const action =
        input.status === "approved"
          ? "review_approved"
          : input.status === "rejected"
            ? "review_rejected"
            : "review_requested";
      await audit.record({
        action,
        actorType: "human",
        actor: input.reviewedBy,
        actorLabel: input.reviewedBy,
        objectType: "catalog_asset_versions",
        objectId: v.id,
        previousState: v,
        newState: next,
        source: "review_queue",
        occurredAt: now,
      });
      return next;
    },

    async addLineageEdge(input, now) {
      requireVersion(input.childAssetVersionId);
      requireVersion(input.parentAssetVersionId);
      // Reuse the pure cycle-checking function — same guarantee the DB
      // trigger catalog_asset_lineage_no_cycle enforces server-side.
      const updated = addLineageEdgePure(
        lineage,
        input.childAssetVersionId,
        input.parentAssetVersionId,
        input.derivationType,
        now,
        input.createdBy,
      );
      const edge = updated[updated.length - 1];
      const withId: CatalogAssetLineageEdge = { ...edge, id: idFactory("lineage") };
      lineage.length = 0;
      lineage.push(...updated.slice(0, -1), withId);
      await audit.record({
        action: "lineage_created",
        actorType: input.createdBy ? "human" : "system",
        actor: input.createdBy,
        actorLabel: input.createdBy ?? "catalog_asset_lineage",
        objectType: "catalog_asset_lineage",
        objectId: withId.id,
        previousState: null,
        newState: withId,
        source: input.derivationType,
        occurredAt: now,
      });
      return withId;
    },

    async addReviewFlag(input, now) {
      if (findOpenFlag(input.subjectType, input.subjectId, input.reasonCode)) {
        throw new ReviewFlagAlreadyOpenError(input.subjectId, input.reasonCode);
      }
      return openFlag(input, now);
    },

    async resolveReviewFlag(input, now) {
      const flag = flags.get(input.flagId);
      if (!flag) throw new Error(`No catalog_review_flags row for id "${input.flagId}"`);
      const next: CatalogReviewFlag = {
        ...flag,
        status: "resolved",
        resolvedAt: now,
        resolvedBy: input.resolvedBy,
        resolution: input.resolution,
      };
      flags.set(flag.id, next);
      return next;
    },

    async listReviewFlags(subjectType, subjectId) {
      return [...flags.values()]
        .filter((f) => f.subjectType === subjectType && f.subjectId === subjectId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async getAssetState(assetVersionId) {
      const version = versions.get(assetVersionId);
      if (!version) return null;
      const recording = recordings.get(version.recordingId);
      if (!recording) return null;
      const work = works.get(recording.workId);
      if (!work) return null;
      return {
        work,
        recording,
        assetVersion: version,
        lineage: lineage.filter(
          (e) => e.assetVersionId === assetVersionId || e.parentAssetVersionId === assetVersionId,
        ),
        verificationJob: jobs.get(assetVersionId) ?? null,
        reviewFlags: [...flags.values()].filter(
          (f) => f.subjectType === "asset_version" && f.subjectId === assetVersionId,
        ),
      };
    },
  };
}
