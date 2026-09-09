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

type PermissionCheckable = Pick<CatalogRightsRecord, "status" | "permissions" | "expiresAt">;

/**
 * A record only grants an action when status is exactly `cleared`, the
 * specific permission flag is set, AND (if set) expiresAt has not passed as
 * of `now`. unknown/under_review/restricted/denied/expired are all treated
 * as "no permission" without collapsing their distinct meanings elsewhere in
 * the system.
 *
 * Expiration is checked HERE, at read time, against the caller-supplied
 * `now` — never via a hidden `new Date()`/`Date.now()` (same discipline as
 * lib/catalog/vault.ts), and never solely by trusting that some background
 * job has already flipped `status` to 'expired'. A 'cleared' record whose
 * expiresAt has passed is treated as having no permission regardless of
 * what the stored status column still says, so a reconciliation job that
 * hasn't run yet can never grant a permission that should no longer exist.
 */
export function hasPermission(record: PermissionCheckable, action: RightsAction, now: string): boolean {
  if (!isCleared(record.status)) return false;
  if (record.expiresAt !== null && record.expiresAt <= now) return false;
  return record.permissions[action] === true;
}

export function canDistribute(record: PermissionCheckable, now: string): boolean {
  return hasPermission(record, "distribution", now);
}
export function canSync(record: PermissionCheckable, now: string): boolean {
  return hasPermission(record, "sync", now);
}
export function canDeliverToPersonaWorks(record: PermissionCheckable, now: string): boolean {
  return hasPermission(record, "personaworks", now);
}
export function canTrainAi(record: PermissionCheckable, now: string): boolean {
  return hasPermission(record, "aiTraining", now);
}
