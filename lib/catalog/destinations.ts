import type {
  CatalogDestination,
  CatalogDestinationAssignment,
  CatalogPersonaWorksDeliveryContract,
  CatalogRightsRecord,
  CatalogSubjectRef,
  DestinationAssignmentStatus,
  PolicyFlag,
} from "./types";
import { evaluatePolicyGate, type PolicyGatedAction } from "./policy";
import { canDeliverToPersonaWorks } from "./rights";

const DESTINATION_GATED_ACTION: Record<CatalogDestination, PolicyGatedAction> = {
  sumg_public: "publish",
  sumg_artist_catalog: "publish",
  sumg_project: "publish",
  personaworks: "program",
  distribution: "distribute",
  sync: "sync",
  social: "publish",
  archive: "publish",
};

export function requestDestination(subject: CatalogSubjectRef, destination: CatalogDestination): CatalogDestinationAssignment {
  return {
    id: `${subject.subjectId}:${destination}:${Date.now()}`,
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
    destination,
    status: "requested",
    approvedBy: null,
    approvedAt: null,
    version: 1,
    destinationAssetId: null,
    failureReason: null,
    policyReason: null,
  };
}

function requireStatus(assignment: CatalogDestinationAssignment, expected: DestinationAssignmentStatus): void {
  if (assignment.status !== expected) {
    throw new Error(`Expected destination assignment in status "${expected}", got "${assignment.status}"`);
  }
}

/**
 * A `requested` assignment can only become `approved` through this explicit
 * call, and only if no policy flag blocks the destination's gated action.
 * There is no path from `requested` straight to `delivered`.
 */
export function approveDestination(
  assignment: CatalogDestinationAssignment,
  approvedBy: string,
  now: string,
  flags: PolicyFlag[] = []
): CatalogDestinationAssignment {
  requireStatus(assignment, "requested");

  const gate = evaluatePolicyGate(flags, DESTINATION_GATED_ACTION[assignment.destination]);
  if (!gate.allowed) {
    return {
      ...assignment,
      status: "blocked",
      policyReason: `Blocked by ${gate.blockedBy.join(", ")}`,
    };
  }

  return { ...assignment, status: "approved", approvedBy, approvedAt: now };
}

export function rejectDestination(assignment: CatalogDestinationAssignment, reason: string): CatalogDestinationAssignment {
  requireStatus(assignment, "requested");
  return { ...assignment, status: "rejected", failureReason: reason };
}

/** Delivery requires the assignment to already be `approved` — this is the "destination delivery requires approval" invariant. */
export function markDelivered(
  assignment: CatalogDestinationAssignment,
  destinationAssetId: string
): CatalogDestinationAssignment {
  requireStatus(assignment, "approved");
  return { ...assignment, status: "delivered", destinationAssetId };
}

/**
 * Pure assembly of a PersonaWorks delivery contract. No network call. The
 * contract is only buildable when rights explicitly grant PersonaWorks
 * delivery — this function throws otherwise rather than emitting a
 * contract with a false permission claim.
 */
export function buildPersonaWorksContract(input: {
  sumgCatalogId: string;
  workId: string;
  recordingId: string;
  assetVersionId: string;
  title: string;
  artistOrPersona: string;
  project: string | null;
  vaultObjectRef: string;
  sha256: string;
  durationSeconds: number | null;
  bpm: number | null;
  key: string | null;
  energy: number | null;
  genre: string | null;
  mood: string | null;
  rights: CatalogRightsRecord;
  programmingRoles: string[];
  visualTraits: Record<string, unknown>;
  provenanceId: string;
}): CatalogPersonaWorksDeliveryContract {
  if (!canDeliverToPersonaWorks(input.rights)) {
    throw new Error("Rights record does not grant PersonaWorks delivery permission");
  }

  return {
    contractVersion: "1.0",
    sumgCatalogId: input.sumgCatalogId,
    workId: input.workId,
    recordingId: input.recordingId,
    assetVersionId: input.assetVersionId,
    title: input.title,
    artistOrPersona: input.artistOrPersona,
    project: input.project,
    assetReference: { vaultObjectRef: input.vaultObjectRef, sha256: input.sha256 },
    durationSeconds: input.durationSeconds,
    bpm: input.bpm,
    key: input.key,
    energy: input.energy,
    genre: input.genre,
    mood: input.mood,
    rightsStatus: input.rights.status,
    personaworksPermission: true,
    programmingRoles: input.programmingRoles,
    visualTraits: input.visualTraits,
    provenanceId: input.provenanceId,
  };
}
