import type { DeletionSafetyStage, IntakeStage } from "./types";

/**
 * Part 15's intake lifecycle. Per docs/SUMG_CATALOG_REUSE_AUDIT.md §4, this is
 * a generalization of the existing `audio_inbox` shape
 * (new_asset → needs_review → ... → uploaded), not a parallel system — a
 * future pass can have audio_inbox grow into this or sit beneath it.
 *
 * Transitions are an explicit adjacency table, not pure "index + 1" forward
 * motion — the lifecycle needs controlled rework/correction paths, not only
 * forward progression:
 * - ROUTED → NEEDS_ROUTING: a proposed routing gets rejected and needs
 *   re-routing.
 * - RIGHTS_REVIEW → NEEDS_ROUTING: rights review rejects the current routing
 *   (e.g. the destination it was routed to isn't rights-clear) and sends it
 *   back for re-routing rather than dead-ending the item.
 * Every non-terminal stage can also move to ARCHIVED directly, as an escape
 * hatch — but no stage can skip ahead past its defined forward/rework
 * neighbors.
 */
const ALLOWED_INTAKE_TRANSITIONS: Record<IntakeStage, IntakeStage[]> = {
  DISCOVERED: ["EXPORTING", "ARCHIVED"],
  EXPORTING: ["SECURED", "ARCHIVED"],
  SECURED: ["VERIFIED", "ARCHIVED"],
  VERIFIED: ["ANALYZING", "ARCHIVED"],
  ANALYZING: ["NEEDS_ROUTING", "ARCHIVED"],
  NEEDS_ROUTING: ["ROUTED", "ARCHIVED"],
  ROUTED: ["RIGHTS_REVIEW", "NEEDS_ROUTING", "ARCHIVED"],
  RIGHTS_REVIEW: ["APPROVED", "NEEDS_ROUTING", "ARCHIVED"],
  APPROVED: ["DISTRIBUTED", "ARCHIVED"],
  DISTRIBUTED: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canAdvanceIntake(from: IntakeStage, to: IntakeStage): boolean {
  return ALLOWED_INTAKE_TRANSITIONS[from].includes(to);
}

export class IntakeTransitionError extends Error {
  constructor(from: IntakeStage, to: IntakeStage) {
    super(`Cannot advance intake from "${from}" directly to "${to}"`);
    this.name = "IntakeTransitionError";
  }
}

export function advanceIntake(from: IntakeStage, to: IntakeStage): IntakeStage {
  if (!canAdvanceIntake(from, to)) throw new IntakeTransitionError(from, to);
  return to;
}

// ─── Source deletion safety (Part 31) ───────────────────────────────────────

const DELETION_ORDER: DeletionSafetyStage[] = [
  "NOT_SECURED",
  "PRIMARY_COPY_VERIFIED",
  "SECONDARY_COPY_VERIFIED",
  "PROVENANCE_SECURED",
  "DESTINATIONS_VERIFIED",
  "SAFE_TO_DELETE",
];

export function canAdvanceDeletionSafety(from: DeletionSafetyStage, to: DeletionSafetyStage): boolean {
  const fromIdx = DELETION_ORDER.indexOf(from);
  const toIdx = DELETION_ORDER.indexOf(to);
  return toIdx === fromIdx + 1;
}

export class DeletionSafetyTransitionError extends Error {
  constructor(from: DeletionSafetyStage, to: DeletionSafetyStage) {
    super(`Cannot advance deletion safety from "${from}" directly to "${to}"`);
    this.name = "DeletionSafetyTransitionError";
  }
}

export function advanceDeletionSafety(from: DeletionSafetyStage, to: DeletionSafetyStage): DeletionSafetyStage {
  if (!canAdvanceDeletionSafety(from, to)) throw new DeletionSafetyTransitionError(from, to);
  return to;
}

export interface DeletionAuthorization {
  authorizedBy: string;
  authorizedAt: string;
  stageAtAuthorization: DeletionSafetyStage;
}

/**
 * Proof that the actor requesting deletion authorization is an authorized
 * human, not an automation worker acting on its own — Part 32 requires
 * worker credentials to be separate from human credentials, and Part 31
 * requires "explicit authorized action" for the final deletion step. A
 * `PolicyGatedAction`-style boolean flag is not enough on its own: both
 * `isHuman` and `hasSourceDeleteAuthority` must be true independently, so an
 * automation worker (never human) and an unauthorized human (human but no
 * grant) are rejected for different, distinguishable reasons.
 */
export interface DeletionActor {
  actorId: string;
  isHuman: boolean;
  hasSourceDeleteAuthority: boolean;
}

export class DeletionNotSafeError extends Error {
  constructor(stage: DeletionSafetyStage) {
    super(`Deletion requires stage "SAFE_TO_DELETE" — current stage is "${stage}"`);
    this.name = "DeletionNotSafeError";
  }
}

export class DeletionActorNotAuthorizedError extends Error {
  constructor(actorId: string, reason: string) {
    super(`Actor "${actorId}" cannot authorize source deletion: ${reason}`);
    this.name = "DeletionActorNotAuthorizedError";
  }
}

/**
 * The only function in this module that produces a deletion authorization —
 * it never performs the deletion itself (nothing in this pass deletes a
 * source; Part 33 disallows it). Requires every safety gate to have passed
 * AND an explicit, verified human actor with source-delete authority —
 * neither condition alone is sufficient.
 */
export function authorizeSourceDeletion(stage: DeletionSafetyStage, actor: DeletionActor, now: string): DeletionAuthorization {
  if (stage !== "SAFE_TO_DELETE") throw new DeletionNotSafeError(stage);
  if (!actor.isHuman) {
    throw new DeletionActorNotAuthorizedError(actor.actorId, "automation workers cannot authorize source deletion");
  }
  if (!actor.hasSourceDeleteAuthority) {
    throw new DeletionActorNotAuthorizedError(actor.actorId, "this actor does not hold source-delete authority");
  }
  return { authorizedBy: actor.actorId, authorizedAt: now, stageAtAuthorization: stage };
}
