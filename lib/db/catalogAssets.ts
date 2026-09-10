import { supabase } from "./supabase"
import {
  assertAuditActorShape,
  type AddLineageEdgeInput,
  type AddReviewFlagInput,
  type AssetCatalogStore,
  type AttachVaultObjectInput,
  type CatalogAuditEvent,
  type CatalogAuditSink,
  type CreateAssetVersionInput,
  type CreateRecordingInput,
  type CreateWorkInput,
  type FailVerificationInput,
  type RecordVerificationInput,
  type ResolveReviewFlagInput,
  type SetReviewStatusInput,
} from "@/lib/catalog/asset-store"
import type {
  CatalogAssetLineageEdge,
  CatalogAssetState,
  CatalogAssetVersion,
  CatalogRecording,
  CatalogReviewFlag,
  CatalogVerificationJob,
  CatalogWork,
  ReviewFlagSubjectType,
} from "@/lib/catalog/types"

/**
 * Real Supabase-backed A1 persistence (SUMG-CAT-P0-003), implementing
 * lib/catalog/asset-store.ts's AssetCatalogStore against the tables in
 * supabase/migrations/20260909180000_catalog_a1_work_recording_version_lineage.sql.
 *
 * IMPORTANT: that migration is NOT applied to production yet — every function
 * here fails with "relation does not exist" until a founder applies it.
 * Nothing in this pass calls these from a route/page/action. Server-side only
 * (service-role client, lib/db/supabase.ts).
 *
 * Audit split (mirrors the migration's [P0-003 FIX] #6 header):
 *   - 'intake_created' (asset version INSERT) and 'lineage_created' (lineage
 *     INSERT) are emitted by DB TRIGGERS — this adapter must NOT re-emit them.
 *   - lifecycle TRANSITIONS ('upload_completed', 'hash_verified',
 *     'verification_passed', 'verification_failed', 'review_approved', ...)
 *     have a real actor only the caller knows, so this adapter emits them via
 *     the injected CatalogAuditSink.
 */

// ─── Row shapes ───────────────────────────────────────────────────────────

type WorkRow = {
  id: string
  title: string
  song_id: string | null
  created_by: string | null
  status: CatalogWork["status"]
  created_at: string
  updated_at: string
}

type RecordingRow = {
  id: string
  work_id: string
  artist_slug: string | null
  created_at: string
}

type AssetVersionRow = {
  id: string
  recording_id: string
  version_kind: CatalogAssetVersion["versionKind"]
  vault_object_ref: string | null
  client_sha256: string | null
  verified_sha256: string | null
  size_bytes: number | string | null
  mime_type: string | null
  duration_seconds: number | string | null
  technical_metadata: Record<string, unknown> | null
  upload_status: CatalogAssetVersion["uploadStatus"]
  review_status: CatalogAssetVersion["reviewStatus"]
  source: CatalogAssetVersion["source"]
  uploaded_by: string | null
  is_primary: boolean
  idempotency_key: string | null
  created_at: string
  updated_at: string
}

type LineageRow = {
  id: string
  asset_version_id: string
  parent_asset_version_id: string | null
  derivation_type: string
  created_by: string | null
  created_at: string
}

type VerificationJobRow = {
  id: string
  asset_version_id: string
  status: CatalogVerificationJob["status"]
  claimed_by: string | null
  claimed_at: string | null
  lease_expires_at: string | null
  attempt_count: number
  last_attempt_at: string | null
  last_error_code: string | null
  last_error_detail: string | null
  next_attempt_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type ReviewFlagRow = {
  id: string
  subject_type: CatalogReviewFlag["subjectType"]
  subject_id: string
  reason_code: CatalogReviewFlag["reasonCode"]
  severity: CatalogReviewFlag["severity"]
  status: CatalogReviewFlag["status"]
  detail: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution: string | null
}

const num = (v: number | string | null): number | null =>
  v === null ? null : typeof v === "number" ? v : Number(v)

function toWork(r: WorkRow): CatalogWork {
  return {
    id: r.id,
    title: r.title,
    songId: r.song_id,
    createdBy: r.created_by,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRecording(r: RecordingRow): CatalogRecording {
  return { id: r.id, workId: r.work_id, artistSlug: r.artist_slug, createdAt: r.created_at }
}

function toAssetVersion(r: AssetVersionRow): CatalogAssetVersion {
  return {
    id: r.id,
    recordingId: r.recording_id,
    versionKind: r.version_kind,
    vaultObjectRef: r.vault_object_ref,
    clientSha256: r.client_sha256,
    verifiedSha256: r.verified_sha256,
    sizeBytes: num(r.size_bytes),
    mimeType: r.mime_type,
    durationSeconds: num(r.duration_seconds),
    technicalMetadata: r.technical_metadata ?? {},
    uploadStatus: r.upload_status,
    reviewStatus: r.review_status,
    source: r.source,
    uploadedBy: r.uploaded_by,
    isPrimary: r.is_primary,
    idempotencyKey: r.idempotency_key,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toLineageEdge(r: LineageRow): CatalogAssetLineageEdge {
  return {
    id: r.id,
    assetVersionId: r.asset_version_id,
    parentAssetVersionId: r.parent_asset_version_id,
    derivationType: r.derivation_type,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }
}

function toVerificationJob(r: VerificationJobRow): CatalogVerificationJob {
  return {
    id: r.id,
    assetVersionId: r.asset_version_id,
    status: r.status,
    claimedBy: r.claimed_by,
    claimedAt: r.claimed_at,
    leaseExpiresAt: r.lease_expires_at,
    attemptCount: r.attempt_count,
    lastAttemptAt: r.last_attempt_at,
    lastErrorCode: r.last_error_code,
    lastErrorDetail: r.last_error_detail,
    nextAttemptAt: r.next_attempt_at,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toReviewFlag(r: ReviewFlagRow): CatalogReviewFlag {
  return {
    id: r.id,
    subjectType: r.subject_type,
    subjectId: r.subject_id,
    reasonCode: r.reason_code,
    severity: r.severity,
    status: r.status,
    detail: r.detail,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
    resolvedBy: r.resolved_by,
    resolution: r.resolution,
  }
}

// ─── Audit sink (writes catalog_audit_log) ────────────────────────────────

/**
 * Lets the DB set occurred_at (DEFAULT now()) rather than trusting the app
 * clock against catalog_audit_log_occurred_at_sane's ±5min CHECK — matching
 * how A2's trigger uses now(). event.occurredAt is advisory only here.
 */
export function createSupabaseAuditSink(): CatalogAuditSink {
  return {
    async record(event: CatalogAuditEvent) {
      assertAuditActorShape(event)
      const { error } = await supabase.from("catalog_audit_log").insert({
        actor: event.actor,
        actor_type: event.actorType,
        actor_label: event.actorLabel,
        action: event.action,
        object_type: event.objectType,
        object_id: event.objectId,
        previous_state: event.previousState ?? null,
        new_state: event.newState ?? null,
        source: event.source,
      })
      if (error) throw new Error(`audit record (${event.action}): ${error.message}`)
    },
  }
}

// ─── Store ────────────────────────────────────────────────────────────────

export function createSupabaseAssetCatalogStore(deps: { auditSink?: CatalogAuditSink } = {}): AssetCatalogStore {
  const audit = deps.auditSink ?? createSupabaseAuditSink()

  async function getVersion(id: string): Promise<CatalogAssetVersion> {
    const { data, error } = await supabase.from("catalog_asset_versions").select("*").eq("id", id).single()
    if (error) throw new Error(`getAssetVersion(${id}): ${error.message}`)
    return toAssetVersion(data as AssetVersionRow)
  }

  return {
    async createWork(input: CreateWorkInput, now: string) {
      const { data, error } = await supabase
        .from("catalog_works")
        .insert({
          title: input.title,
          song_id: input.songId,
          created_by: input.createdBy,
          status: input.status ?? "intake",
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single()
      if (error) throw new Error(`createWork: ${error.message}`)
      return toWork(data as WorkRow)
    },

    async createRecording(input: CreateRecordingInput, now: string) {
      const { data, error } = await supabase
        .from("catalog_recordings")
        .insert({ work_id: input.workId, artist_slug: input.artistSlug, created_at: now })
        .select("*")
        .single()
      if (error) throw new Error(`createRecording: ${error.message}`)
      return toRecording(data as RecordingRow)
    },

    async createAssetVersion(input: CreateAssetVersionInput, now: string) {
      // 'intake_created' is emitted by the DB trigger — not here.
      const { data, error } = await supabase
        .from("catalog_asset_versions")
        .insert({
          recording_id: input.recordingId,
          version_kind: input.versionKind,
          source: input.source,
          uploaded_by: input.uploadedBy,
          client_sha256: input.clientSha256 ?? null,
          mime_type: input.mimeType ?? null,
          size_bytes: input.sizeBytes ?? null,
          duration_seconds: input.durationSeconds ?? null,
          technical_metadata: input.technicalMetadata ?? {},
          is_primary: input.isPrimary ?? false,
          idempotency_key: input.idempotencyKey ?? null,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single()
      if (error) throw new Error(`createAssetVersion: ${error.message}`)
      return toAssetVersion(data as AssetVersionRow)
    },

    async attachVaultObject(input: AttachVaultObjectInput, now: string) {
      const before = await getVersion(input.assetVersionId)
      if (before.vaultObjectRef !== null) {
        throw new Error(
          `attachVaultObject: asset version ${input.assetVersionId} already has a vault object — replacement is a new version`,
        )
      }
      const patch: Record<string, unknown> = {
        vault_object_ref: input.vaultObjectRef,
        upload_status: "uploaded_unverified",
        updated_at: now,
      }
      if (input.clientSha256 !== undefined) patch.client_sha256 = input.clientSha256
      if (input.sizeBytes !== undefined) patch.size_bytes = input.sizeBytes
      if (input.mimeType !== undefined) patch.mime_type = input.mimeType

      const { data, error } = await supabase
        .from("catalog_asset_versions")
        .update(patch)
        .eq("id", input.assetVersionId)
        .is("vault_object_ref", null)
        .select("*")
        .single()
      if (error) throw new Error(`attachVaultObject: ${error.message}`)
      const after = toAssetVersion(data as AssetVersionRow)
      await audit.record({
        action: "upload_completed",
        actorType: input.actor ? "human" : "system",
        actor: input.actor,
        actorLabel: input.actor ?? after.source,
        objectType: "catalog_asset_versions",
        objectId: after.id,
        previousState: before,
        newState: after,
        source: after.source,
        occurredAt: now,
      })
      return after
    },

    async createVerificationJob(assetVersionId: string, now: string) {
      const existing = await this.getVerificationJob(assetVersionId)
      if (existing) return existing
      const { data, error } = await supabase
        .from("catalog_verification_jobs")
        .insert({ asset_version_id: assetVersionId, created_at: now, updated_at: now })
        .select("*")
        .single()
      if (error) throw new Error(`createVerificationJob: ${error.message}`)
      return toVerificationJob(data as VerificationJobRow)
    },

    async getVerificationJob(assetVersionId: string) {
      const { data, error } = await supabase
        .from("catalog_verification_jobs")
        .select("*")
        .eq("asset_version_id", assetVersionId)
        .maybeSingle()
      if (error) throw new Error(`getVerificationJob: ${error.message}`)
      return data ? toVerificationJob(data as VerificationJobRow) : null
    },

    async recordVerification(input: RecordVerificationInput, now: string) {
      const before = await getVersion(input.assetVersionId)
      // A hash mismatch is ONLY a present client claim contradicted by the
      // authoritative re-hash. An absent client_sha256 is not suspicious
      // (schema: "never trusted alone") — nothing to contradict, so success.
      const mismatch = before.clientSha256 !== null && before.clientSha256 !== input.verifiedSha256

      const patch: Record<string, unknown> = {
        // authoritative hash of what is actually stored — recorded on BOTH
        // paths; client_sha256 is never overwritten.
        verified_sha256: input.verifiedSha256,
        upload_status: mismatch ? "verification_failed" : "verified",
        updated_at: now,
      }
      if (input.technicalMetadata !== undefined) patch.technical_metadata = input.technicalMetadata
      if (input.durationSeconds !== undefined) patch.duration_seconds = input.durationSeconds

      const { data, error } = await supabase
        .from("catalog_asset_versions")
        .update(patch)
        .eq("id", input.assetVersionId)
        .select("*")
        .single()
      if (error) throw new Error(`recordVerification: ${error.message}`)
      const after = toAssetVersion(data as AssetVersionRow)

      const jobPatch = mismatch
        ? {
            status: "failed",
            last_attempt_at: now,
            last_error_code: "hash_mismatch",
            last_error_detail: `client_sha256=${before.clientSha256} verified_sha256=${input.verifiedSha256}`,
            updated_at: now,
          }
        : { status: "completed", completed_at: now, last_attempt_at: now, updated_at: now }
      const { error: jobErr } = await supabase
        .from("catalog_verification_jobs")
        .update(jobPatch)
        .eq("asset_version_id", input.assetVersionId)
      if (jobErr) throw new Error(`recordVerification/job: ${jobErr.message}`)

      if (mismatch) {
        await audit.record({
          action: "hash_mismatch",
          actorType: "worker",
          actor: null,
          actorLabel: input.workerLabel,
          objectType: "catalog_asset_versions",
          objectId: after.id,
          previousState: before,
          newState: after,
          source: "verification_worker",
          occurredAt: now,
        })
        await audit.record({
          action: "verification_failed",
          actorType: "worker",
          actor: null,
          actorLabel: input.workerLabel,
          objectType: "catalog_asset_versions",
          objectId: after.id,
          previousState: before,
          newState: after,
          source: "verification_worker",
          occurredAt: now,
        })
        // Surface it to a human via the existing review-flag model. Idempotent:
        // 23505 = an open hash_mismatch flag already exists
        // (catalog_review_flags_one_open_per_reason) — tolerated.
        const { error: flagErr } = await supabase.from("catalog_review_flags").insert({
          subject_type: "asset_version",
          subject_id: after.id,
          reason_code: "hash_mismatch",
          severity: "blocked",
          detail: "authoritative stored-object hash does not match the client-submitted advisory hash",
          created_at: now,
        })
        if (flagErr && flagErr.code !== "23505") {
          throw new Error(`recordVerification/flag: ${flagErr.message}`)
        }
        return after
      }

      await audit.record({
        action: "hash_verified",
        actorType: "worker",
        actor: null,
        actorLabel: input.workerLabel,
        objectType: "catalog_asset_versions",
        objectId: after.id,
        previousState: before,
        newState: after,
        source: "verification_worker",
        occurredAt: now,
      })
      await audit.record({
        action: "verification_passed",
        actorType: "worker",
        actor: null,
        actorLabel: input.workerLabel,
        objectType: "catalog_asset_versions",
        objectId: after.id,
        previousState: before,
        newState: after,
        source: "verification_worker",
        occurredAt: now,
      })
      return after
    },

    async failVerification(input: FailVerificationInput, now: string) {
      const before = await getVersion(input.assetVersionId)
      const { data, error } = await supabase
        .from("catalog_asset_versions")
        .update({ upload_status: "verification_failed", updated_at: now })
        .eq("id", input.assetVersionId)
        .select("*")
        .single()
      if (error) throw new Error(`failVerification: ${error.message}`)
      const after = toAssetVersion(data as AssetVersionRow)

      await supabase
        .from("catalog_verification_jobs")
        .update({
          status: "failed",
          last_attempt_at: now,
          last_error_code: input.errorCode,
          last_error_detail: input.errorDetail,
          updated_at: now,
        })
        .eq("asset_version_id", input.assetVersionId)

      await audit.record({
        action: "verification_failed",
        actorType: "worker",
        actor: null,
        actorLabel: input.workerLabel,
        objectType: "catalog_asset_versions",
        objectId: after.id,
        previousState: before,
        newState: after,
        source: "verification_worker",
        occurredAt: now,
      })
      return after
    },

    async setReviewStatus(input: SetReviewStatusInput, now: string) {
      const before = await getVersion(input.assetVersionId)
      const { data, error } = await supabase
        .from("catalog_asset_versions")
        .update({ review_status: input.status, updated_at: now })
        .eq("id", input.assetVersionId)
        .select("*")
        .single()
      if (error) throw new Error(`setReviewStatus: ${error.message}`)
      const after = toAssetVersion(data as AssetVersionRow)
      const action =
        input.status === "approved"
          ? "review_approved"
          : input.status === "rejected"
            ? "review_rejected"
            : "review_requested"
      await audit.record({
        action,
        actorType: "human",
        actor: input.reviewedBy,
        actorLabel: input.reviewedBy,
        objectType: "catalog_asset_versions",
        objectId: after.id,
        previousState: before,
        newState: after,
        source: "review_queue",
        occurredAt: now,
      })
      return after
    },

    async addLineageEdge(input: AddLineageEdgeInput, now: string) {
      // 'lineage_created' is emitted by the DB trigger; the DB cycle trigger
      // (catalog_asset_lineage_no_cycle) rejects a cycle server-side.
      const { data, error } = await supabase
        .from("catalog_asset_lineage")
        .insert({
          asset_version_id: input.childAssetVersionId,
          parent_asset_version_id: input.parentAssetVersionId,
          derivation_type: input.derivationType,
          created_by: input.createdBy,
          created_at: now,
        })
        .select("*")
        .single()
      if (error) throw new Error(`addLineageEdge: ${error.message}`)
      return toLineageEdge(data as LineageRow)
    },

    async addReviewFlag(input: AddReviewFlagInput, now: string) {
      const { data, error } = await supabase
        .from("catalog_review_flags")
        .insert({
          subject_type: input.subjectType,
          subject_id: input.subjectId,
          reason_code: input.reasonCode,
          severity: input.severity,
          detail: input.detail,
          created_at: now,
        })
        .select("*")
        .single()
      if (error) throw new Error(`addReviewFlag: ${error.message}`)
      return toReviewFlag(data as ReviewFlagRow)
    },

    async resolveReviewFlag(input: ResolveReviewFlagInput, now: string) {
      const { data, error } = await supabase
        .from("catalog_review_flags")
        .update({
          status: "resolved",
          resolved_at: now,
          resolved_by: input.resolvedBy,
          resolution: input.resolution,
        })
        .eq("id", input.flagId)
        .select("*")
        .single()
      if (error) throw new Error(`resolveReviewFlag: ${error.message}`)
      return toReviewFlag(data as ReviewFlagRow)
    },

    async listReviewFlags(subjectType: ReviewFlagSubjectType, subjectId: string) {
      const { data, error } = await supabase
        .from("catalog_review_flags")
        .select("*")
        .eq("subject_type", subjectType)
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: true })
      if (error) throw new Error(`listReviewFlags: ${error.message}`)
      return (data ?? []).map((r) => toReviewFlag(r as ReviewFlagRow))
    },

    async getAssetState(assetVersionId: string): Promise<CatalogAssetState | null> {
      const { data: vRow, error: vErr } = await supabase
        .from("catalog_asset_versions")
        .select("*")
        .eq("id", assetVersionId)
        .maybeSingle()
      if (vErr) throw new Error(`getAssetState/version: ${vErr.message}`)
      if (!vRow) return null
      const assetVersion = toAssetVersion(vRow as AssetVersionRow)

      const { data: rRow, error: rErr } = await supabase
        .from("catalog_recordings")
        .select("*")
        .eq("id", assetVersion.recordingId)
        .single()
      if (rErr) throw new Error(`getAssetState/recording: ${rErr.message}`)
      const recording = toRecording(rRow as RecordingRow)

      const { data: wRow, error: wErr } = await supabase
        .from("catalog_works")
        .select("*")
        .eq("id", recording.workId)
        .single()
      if (wErr) throw new Error(`getAssetState/work: ${wErr.message}`)
      const work = toWork(wRow as WorkRow)

      const { data: lRows, error: lErr } = await supabase
        .from("catalog_asset_lineage")
        .select("*")
        .or(`asset_version_id.eq.${assetVersionId},parent_asset_version_id.eq.${assetVersionId}`)
      if (lErr) throw new Error(`getAssetState/lineage: ${lErr.message}`)
      const lineage = (lRows ?? []).map((r) => toLineageEdge(r as LineageRow))

      const verificationJob = await this.getVerificationJob(assetVersionId)
      const reviewFlags = await this.listReviewFlags("asset_version", assetVersionId)

      return { work, recording, assetVersion, lineage, verificationJob, reviewFlags }
    },
  }
}
