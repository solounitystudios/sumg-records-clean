import type { CatalogDestination, RightsPermissions, RightsStatus } from "./types";
import type { RightsAction } from "./rights";

/**
 * Pure rights-routing decision layer (Part 14). This function makes no
 * writes and calls nothing — it is a yes/no answer plus a human-readable
 * reason, for a caller (e.g. a future destinations.ts approval flow) to
 * act on. It does NOT check hard policy flags (DO_NOT_DISTRIBUTE etc.) —
 * that's lib/catalog/policy.ts's job, already composed into
 * destinations.ts::approveDestination(). Keeping this function scoped to
 * rights only, not duplicating the policy-flag check, is a composability
 * decision: a real approval flow calls both and requires both to pass.
 *
 * `destination` and `purpose` are deliberately separate inputs, matching
 * the requested signature: `purpose` (a RightsAction — the same
 * distribution/sync/personaworks/aiTraining vocabulary rights.ts already
 * uses) is what actually gates the boolean outcome, since what matters
 * legally is which RIGHT is being exercised, not the specific destination
 * string. `destination` is retained as descriptive context for the
 * decision record/audit trail (a future destination_route_requested/
 * allowed/blocked audit event needs to know the actual destination even
 * though the permission check itself is governed by `purpose`) — not
 * derived from `purpose`, and not the other way around, because more than
 * one destination can share the same underlying right (e.g. both
 * `sumg_public` and `social` could be distribution-governed).
 */
export interface RouteCheckInput {
  rightsStatus: RightsStatus;
  permissions: RightsPermissions;
  /** Same nullable-expiry semantics as lib/catalog/rights.ts::hasPermission — checked here too, never assumed already reflected in `rightsStatus`. */
  expiresAt: string | null;
  destination: CatalogDestination;
  purpose: RightsAction;
  now: string;
}

export interface RouteCheckResult {
  allowed: boolean;
  reason: string;
}

/**
 * The full rights-routing matrix, per Part 14:
 * - unknown/under_review/denied/expired: unconditionally blocked. unknown
 *   is blocked because external/public routing requires affirmative
 *   clearance — this is NOT the same claim as "unknown means denied"
 *   (lib/catalog/rights.ts::isDenied() correctly excludes 'unknown'); it's
 *   a routing-specific default-deny, not a redefinition of what unknown
 *   means.
 * - restricted: allowed ONLY where the specific permission flag is
 *   explicitly true — the one status where the permission flags are
 *   consulted without status being 'cleared'.
 * - cleared: still requires the specific permission flag — clearance alone
 *   is never sufficient. This is the exact case Part 14 highlights:
 *   PersonaWorks must not receive an asset merely because status=cleared;
 *   it needs permissions.personaworks specifically.
 * - expiresAt, when set, is checked against `now` regardless of which
 *   branch above allowed the request through — an expired restricted or
 *   cleared grant is blocked the same way lib/catalog/rights.ts::
 *   hasPermission() blocks it.
 */
export function canRouteAsset(input: RouteCheckInput): RouteCheckResult {
  const { rightsStatus, permissions, expiresAt, destination, purpose, now } = input;

  if (rightsStatus === "unknown") {
    return { allowed: false, reason: `Rights status is unknown for destination "${destination}" — routing requires affirmative clearance, not absence of denial.` };
  }
  if (rightsStatus === "under_review") {
    return { allowed: false, reason: `Rights are under review — routing to "${destination}" is blocked until review completes.` };
  }
  if (rightsStatus === "denied") {
    return { allowed: false, reason: `Rights are explicitly denied for destination "${destination}".` };
  }
  if (rightsStatus === "expired") {
    return { allowed: false, reason: `Rights status is expired for destination "${destination}".` };
  }

  // From here: status is 'restricted' or 'cleared' — both require the
  // specific permission flag; neither status alone is sufficient.
  if (permissions[purpose] !== true) {
    return {
      allowed: false,
      reason: `Rights status "${rightsStatus}" does not grant the "${purpose}" permission — required for destination "${destination}", and status alone (even "cleared") is never enough.`,
    };
  }

  if (expiresAt !== null && expiresAt <= now) {
    return { allowed: false, reason: `Rights for "${purpose}" have expired as of the check time, even though the stored status has not been updated to reflect it yet.` };
  }

  return { allowed: true, reason: `Rights status "${rightsStatus}" explicitly grants "${purpose}" for destination "${destination}".` };
}
