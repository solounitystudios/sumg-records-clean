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

// ─── Work / Recording / Version / Lineage (catalog_works, A1) ──────────────

export interface CatalogWork {
  id: string;
  title: string;
  /** Nullable pointer back to the existing songs table — songs.id is TEXT. */
  songId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogRecording {
  id: string;
  workId: string;
  title: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface CatalogAssetVersion {
  id: string;
  recordingId: string;
  versionKind: AssetVersionKind;
  /** Opaque pointer into the Private Master Vault. Never a public URL. */
  vaultObjectRef: string | null;
  sha256: string | null;
  sizeBytes: number | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogAssetLineageEdge {
  id: string;
  assetVersionId: string;
  parentAssetVersionId: string | null;
  derivationType: string;
  createdAt: string;
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
  setBy: string;
  setAt: string;
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
export interface CatalogPersonaWorksDeliveryContract {
  contractVersion: "1.0";
  sumgCatalogId: string;
  workId: string;
  recordingId: string;
  assetVersionId: string;
  title: string;
  artistOrPersona: string;
  project: string | null;
  assetReference: { vaultObjectRef: string; sha256: string };
  durationSeconds: number | null;
  bpm: number | null;
  key: string | null;
  energy: number | null;
  genre: string | null;
  mood: string | null;
  rightsStatus: RightsStatus;
  personaworksPermission: boolean;
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
