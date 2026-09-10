/**
 * Pure type contracts for the SUMG canonical catalog domain layer.
 *
 * Nothing in this file talks to Supabase, storage, or any network. Shapes here
 * mirror the proposed schema in supabase/migrations_proposed/A1-A5 (not applied —
 * see docs/SUMG_CATALOG_PERSISTENCE_AUDIT.md) so that a future persistence layer
 * can adopt these types directly. `songs` and `releases` remain the existing
 * public/editorial projection — see docs/SUMG_CATALOG_COMMAND_CENTER_ARCHITECTURE.md §1.
 */

export type CatalogSubjectType = "work" | "recording" | "song" | "release";

export interface CatalogSubjectRef {
  subjectType: CatalogSubjectType;
  subjectId: string;
}

// ─── Provenance ────────────────────────────────────────────────────────────

export type ProvenanceSource =
  | "measured"
  | "deterministic"
  | "ai_inferred"
  | "editor_assigned"
  | "founder_assigned"
  | "telemetry_learned"
  | "imported_source";

export type ProvenanceAuthority = "suggestion" | "derived" | "canonical" | "policy";

export interface ProvenanceValue<T> {
  value: T;
  source: ProvenanceSource;
  authority: ProvenanceAuthority;
  /** Required when source is ai_inferred or telemetry_learned. */
  confidence?: number;
  sourceVersion?: string;
  observedAt: string;
}

// ─── Work / Recording / Version / Lineage (A1) ────────────────────────────
//
// Reconciled with supabase/migrations/20260909180000_catalog_a1_*.sql during
// SUMG-CAT-P0-003. The pre-production hardening pass revised the A1 schema
// (sha256 -> client_sha256 + verified_sha256; six upload states; per-recording
// artist_slug instead of a recording title; work status/created_by) but these
// interfaces were not updated with it. This is the narrowest reconciliation:
// the shapes here now mirror the applied migration exactly. See
// docs/SUMG_CAT_P0_003_MASTERVAULT_A1.md §"Domain / schema reconciliation".

export type CatalogWorkStatus = "intake" | "active" | "archived";

export interface CatalogWork {
  id: string;
  title: string;
  /** Nullable pointer back to the existing songs table — songs.id is TEXT. Never forces a backfill. */
  songId: string | null;
  /** Provenance — who created this work. Null after that user is deleted. Not an access boundary. */
  createdBy: string | null;
  status: CatalogWorkStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogRecording {
  id: string;
  workId: string;
  /** Loose text reference, matching the repo-wide artist_slug convention. No hard FK. */
  artistSlug: string | null;
  createdAt: string;
}

export type AssetVersionKind =
  | "master"
  | "clean"
  | "explicit"
  | "instrumental"
  | "acapella"
  | "radio_edit"
  | "stem_set"
  | "other";

/** Upload / verification pipeline state — orthogonal to reviewStatus. */
export type AssetUploadStatus =
  | "pending_upload"
  | "uploaded_unverified"
  | "verifying"
  | "verified"
  | "verification_failed"
  | "cancelled";

/** Review Queue state — "has a human looked at this catalog record yet." Separate from rights and routing. */
export type AssetReviewStatus = "pending_review" | "approved" | "held" | "archived" | "rejected";

export type AssetVersionSource = "manual_upload" | "worker_derivative" | "system_import" | "api_upload";

export interface CatalogAssetVersion {
  id: string;
  recordingId: string;
  versionKind: AssetVersionKind;
  /**
   * Opaque pointer into the Private Master Vault (bucket sumg-master-vault).
   * Canonical shape `masters/<recordingId>/<id>/original.<ext>`. NEVER a
   * public URL. Null until the upload is prepared.
   */
  vaultObjectRef: string | null;
  /** Advisory hash submitted by the client before verification. Never trusted alone. */
  clientSha256: string | null;
  /** Authoritative hash — set only after the stored object is re-hashed server-side. */
  verifiedSha256: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  durationSeconds: number | null;
  /** Deterministic technical facts only (sample_rate, channels, bitrate_kbps, ...). No AI-inferred field. */
  technicalMetadata: Record<string, unknown>;
  uploadStatus: AssetUploadStatus;
  reviewStatus: AssetReviewStatus;
  source: AssetVersionSource;
  /** Provenance — who uploaded this. Null after that user is deleted. */
  uploadedBy: string | null;
  isPrimary: boolean;
  /** Client-generated, persisted through retries. Null for non-client paths. */
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogAssetLineageEdge {
  id: string;
  assetVersionId: string;
  parentAssetVersionId: string | null;
  derivationType: string;
  /** Provenance — who created this derivation edge. Null for a system/worker path or after user deletion. */
  createdBy?: string | null;
  createdAt: string;
}

// ─── Verification job / Review flag (A1) ──────────────────────────────────

export type VerificationJobStatus = "pending" | "claimed" | "completed" | "failed";

export interface CatalogVerificationJob {
  id: string;
  assetVersionId: string;
  status: VerificationJobStatus;
  /** Worker instance identity (hostname:pid or a worker UUID) — never an auth.users FK. */
  claimedBy: string | null;
  claimedAt: string | null;
  leaseExpiresAt: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorDetail: string | null;
  nextAttemptAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReviewFlagSubjectType = "work" | "recording" | "asset_version";

export type ReviewFlagReasonCode =
  | "rights_unknown"
  | "duplicate_hash"
  | "metadata_missing"
  | "verification_failed"
  | "unsupported_format"
  | "duration_invalid"
  | "hash_mismatch"
  | "lineage_conflict"
  | "quarantine_required";

export type ReviewFlagSeverity = "info" | "review" | "blocked" | "critical";

export type ReviewFlagStatus = "open" | "resolved";

export interface CatalogReviewFlag {
  id: string;
  subjectType: ReviewFlagSubjectType;
  subjectId: string;
  reasonCode: ReviewFlagReasonCode;
  severity: ReviewFlagSeverity;
  status: ReviewFlagStatus;
  detail: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
}

/**
 * The assembled catalog-asset state a founder reviews — one master's full
 * governed chain, read back through lib/db/catalogAssets.ts.
 */
export interface CatalogAssetState {
  work: CatalogWork;
  recording: CatalogRecording;
  assetVersion: CatalogAssetVersion;
  lineage: CatalogAssetLineageEdge[];
  verificationJob: CatalogVerificationJob | null;
  reviewFlags: CatalogReviewFlag[];
}

/** Public media row — corresponds to the existing `assets` table, unchanged. */
export interface CatalogAsset {
  id: string;
  type: "image" | "video" | "audio" | "document" | "design" | "archive";
  url: string;
  filename: string;
}

// ─── Metadata / Intelligence values ─────────────────────────────────────────

export interface CatalogMetadataValue<T = unknown> extends CatalogSubjectRef {
  field: string;
  provenance: ProvenanceValue<T>;
}

export interface CatalogIntelligenceValue<T = unknown> extends CatalogSubjectRef {
  field: string;
  provenance: ProvenanceValue<T>;
}

// ─── Editorial / Routing (A3) ───────────────────────────────────────────────

export interface CatalogEditorialDecision extends CatalogSubjectRef {
  id: string;
  decisionType: string;
  value: unknown;
  source: ProvenanceSource;
  authority: ProvenanceAuthority;
  confidence?: number;
  decidedBy: string;
  decidedAt: string;
}

export interface CatalogRoutingRecipe {
  id: string;
  name: string;
  description: string;
  rules: Record<string, unknown>;
  createdBy: string;
}

export type RoutingDecisionStatus = "proposed" | "approved" | "rejected";

export interface CatalogRoutingDecision extends CatalogSubjectRef {
  id: string;
  recipeId: string | null;
  proposedAssignment: Record<string, unknown>;
  status: RoutingDecisionStatus;
  decidedBy: string | null;
  decidedAt: string | null;
}

// ─── Rights / Policy (A2) ────────────────────────────────────────────────────

export type RightsStatus = "unknown" | "under_review" | "cleared" | "restricted" | "denied" | "expired";

export interface RightsPermissions {
  distribution: boolean;
  sync: boolean;
  personaworks: boolean;
  aiTraining: boolean;
}

export interface CatalogRightsRecord extends CatalogSubjectRef {
  id: string;
  status: RightsStatus;
  ownerEntity: string | null;
  territory: string | null;
  evidenceDocumentId: string | null;
  contractId: string | null;
  permissions: RightsPermissions;
  /** Null when the record was set by an automated source with no human actor (e.g. an import), never a placeholder string. */
  setBy: string | null;
  setAt: string;
  /** When set, a 'cleared' status past this instant must be treated as expired at check time — never rely solely on a background job having flipped `status`. */
  expiresAt: string | null;
}

export type PolicyFlag =
  | "DO_NOT_RELEASE"
  | "DO_NOT_PROGRAM"
  | "DO_NOT_DISTRIBUTE"
  | "DO_NOT_SYNC"
  | "DO_NOT_TRAIN_AI"
  | "DO_NOT_PUBLISH"
  | "DO_NOT_DELETE"
  | "PRIVATE_PERSONAL"
  | "RIGHTS_HOLD";

export interface CatalogPolicyFlagRecord extends CatalogSubjectRef {
  id: string;
  flag: PolicyFlag;
  reason: string;
  setBy: string;
  setAt: string;
}

// ─── Destinations / Receipts (A4) ───────────────────────────────────────────

export type CatalogDestination =
  | "sumg_public"
  | "sumg_artist_catalog"
  | "sumg_project"
  | "personaworks"
  | "distribution"
  | "sync"
  | "social"
  | "archive";

export type DestinationAssignmentStatus = "requested" | "approved" | "rejected" | "blocked" | "delivered";

export interface CatalogDestinationAssignment extends CatalogSubjectRef {
  id: string;
  destination: CatalogDestination;
  status: DestinationAssignmentStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  version: number;
  destinationAssetId: string | null;
  failureReason: string | null;
  policyReason: string | null;
}

export interface CatalogDeliveryReceipt {
  id: string;
  assignmentId: string;
  deliveredAt: string;
  receipt: Record<string, unknown>;
  checksum: string | null;
}

/**
 * Versioned, self-contained delivery contract for PersonaWorks (Part 24).
 * NOT a live integration — PersonaWorks independently ingests and verifies
 * this shape. No network code lives in lib/catalog/.
 */
export type CatalogAvailabilityState = "available" | "not_available";

export interface CatalogPersonaWorksDeliveryContract {
  contractVersion: "1.1";
  sumgCatalogId: string;
  workId: string;
  recordingId: string;
  assetVersionId: string;
  /** version_kind + is_primary snapshot — "which cut is this" (Part 15's "version"). */
  versionKind: string;
  title: string;
  artistOrPersona: string;
  project: string | null;
  /**
   * Opaque, never independently resolvable by PersonaWorks — this is a
   * pointer, not a downloadable URL. Turning it into an actual signed read
   * requires PersonaWorks calling back to SUMG, which is explicitly a
   * future integration, not part of this contract. Embedding a real signed
   * URL here would require refresh mechanics that don't exist yet and
   * would let the reference outlive its intended access window.
   */
  assetReference: { vaultObjectRef: string; verifiedSha256: string };
  mimeType: string | null;
  durationSeconds: number | null;
  bpm: number | null;
  key: string | null;
  energy: number | null;
  genre: string | null;
  mood: string | null;
  rightsStatus: RightsStatus;
  /** Full permission snapshot, not just the personaworks flag — PersonaWorks needs to know the other flags too (e.g. whether it may also treat this as distribution/sync-cleared) even though only `personaworksPermission` gates whether this contract exists at all. */
  rightsPermissions: RightsPermissions;
  personaworksPermission: boolean;
  /**
   * Whether SUMG considers this specific asset version ready for handoff —
   * derived from upload_status='verified' AND review_status='approved',
   * never from rights alone. A cleared-rights asset that hasn't passed
   * technical verification or editorial review is 'not_available'
   * regardless of what buildPersonaWorksContract's rights check says.
   */
  availabilityState: CatalogAvailabilityState;
  programmingRoles: string[];
  visualTraits: Record<string, unknown>;
  provenanceId: string;
}

// ─── Intake lifecycle / deletion safety ─────────────────────────────────────

export type IntakeStage =
  | "DISCOVERED"
  | "EXPORTING"
  | "SECURED"
  | "VERIFIED"
  | "ANALYZING"
  | "NEEDS_ROUTING"
  | "ROUTED"
  | "RIGHTS_REVIEW"
  | "APPROVED"
  | "DISTRIBUTED"
  | "ACTIVE"
  | "ARCHIVED";

export type DeletionSafetyStage =
  | "NOT_SECURED"
  | "PRIMARY_COPY_VERIFIED"
  | "SECONDARY_COPY_VERIFIED"
  | "PROVENANCE_SECURED"
  | "DESTINATIONS_VERIFIED"
  | "SAFE_TO_DELETE";

// ─── Source adapter / connections ───────────────────────────────────────────

export interface CatalogSource {
  id: string;
  provider: string;
  displayName: string;
}

export type ProviderConnectionStatus = "connected" | "disconnected" | "expired" | "error";

/** Design-only shape for Part 17. No credential value ever appears here. */
export interface CatalogConnection {
  id: string;
  organizationId: string;
  ownerId: string;
  provider: string;
  /** Indirection only — points at a secret manager entry, never the secret itself. */
  credentialRef: string;
  scopes: string[];
  status: ProviderConnectionStatus;
  lastSyncAt: string | null;
  expiresAt: string | null;
}

export interface CatalogSyncJob {
  id: string;
  connectionId: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "succeeded" | "failed";
}

export interface CatalogSyncItem {
  id: string;
  syncJobId: string;
  externalRef: string;
  outcome: "created" | "updated" | "skipped" | "conflict" | "invalid";
}

// ─── Audit log (A5) ──────────────────────────────────────────────────────────

export interface CatalogAuditLogEntry {
  actor: string;
  action: string;
  objectType: string;
  objectId: string;
  previousState?: unknown;
  newState?: unknown;
  occurredAt: string;
  jobId?: string;
  reason?: string;
  approval?: string;
  automationRuleId?: string;
  source?: string;
  destination?: string;
}
