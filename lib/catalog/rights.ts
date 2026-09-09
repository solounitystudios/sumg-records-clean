import type { CatalogRightsRecord, ProvenanceSource, RightsPermissions, RightsStatus } from "./types";

export const UNKNOWN_RIGHTS_STATUS: RightsStatus = "unknown";

/**
 * unknown is never denied and never cleared — every caller must branch on it
 * explicitly rather than defaulting to either extreme.
 */
export function isUnknown(status: RightsStatus): boolean {
  return status === "unknown";
}
export function isCleared(status: RightsStatus): boolean {
  return status === "cleared";
}
export function isDenied(status: RightsStatus): boolean {
  return status === "denied" || status === "restricted" || status === "expired";
}

export class RightsAiClearanceError extends Error {
  constructor() {
    super("AI cannot set a rights record to cleared");
    this.name = "RightsAiClearanceError";
  }
}

/**
 * AI must never set cleared (Part 9). Call this before persisting any rights
 * status change.
 */
export function assertAiCannotClear(nextStatus: RightsStatus, setBySource: ProvenanceSource): void {
  if (nextStatus === "cleared" && (setBySource === "ai_inferred" || setBySource === "telemetry_learned")) {
    throw new RightsAiClearanceError();
  }
}

export type RightsAction = keyof RightsPermissions;

/**
 * A record only grants an action when status is exactly `cleared` AND the
 * specific permission flag is set. unknown/under_review/restricted/denied/
 * expired are all treated as "no permission" without collapsing their
 * distinct meanings elsewhere in the system.
 */
export function hasPermission(record: Pick<CatalogRightsRecord, "status" | "permissions">, action: RightsAction): boolean {
  if (!isCleared(record.status)) return false;
  return record.permissions[action] === true;
}

export function canDistribute(record: Pick<CatalogRightsRecord, "status" | "permissions">): boolean {
  return hasPermission(record, "distribution");
}
export function canSync(record: Pick<CatalogRightsRecord, "status" | "permissions">): boolean {
  return hasPermission(record, "sync");
}
export function canDeliverToPersonaWorks(record: Pick<CatalogRightsRecord, "status" | "permissions">): boolean {
  return hasPermission(record, "personaworks");
}
export function canTrainAi(record: Pick<CatalogRightsRecord, "status" | "permissions">): boolean {
  return hasPermission(record, "aiTraining");
}
