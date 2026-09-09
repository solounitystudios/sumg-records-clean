import type { CatalogRoutingDecision, CatalogRoutingRecipe, CatalogSubjectRef, PolicyFlag, RoutingDecisionStatus } from "./types";
import { overridesRecommendation, type PolicyGatedAction } from "./policy";

export interface RoutingActor {
  id: string;
  isFounderOrAuthorized: boolean;
}

export class RoutingAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutingAuthorizationError";
  }
}

/**
 * Evaluating a recipe always produces a `proposed` decision. There is no code
 * path in this module that returns `approved` directly from recipe
 * evaluation — approval requires a separate, explicit human action
 * (`approveRoutingDecision`). This is the "routing recipes are proposals"
 * invariant from Part 21/34.
 */
export function applyRecipe(
  recipe: CatalogRoutingRecipe,
  subject: CatalogSubjectRef,
  proposedAssignment: Record<string, unknown>,
  now: string
): CatalogRoutingDecision {
  return {
    id: `${recipe.id}:${subject.subjectId}:${now}`,
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
    recipeId: recipe.id,
    proposedAssignment,
    status: "proposed",
    decidedBy: null,
    decidedAt: null,
  };
}

/** Manual routing (no recipe) — still born `proposed`. */
export function proposeManualRouting(
  subject: CatalogSubjectRef,
  proposedAssignment: Record<string, unknown>,
  now: string
): CatalogRoutingDecision {
  return {
    id: `manual:${subject.subjectId}:${now}`,
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
    recipeId: null,
    proposedAssignment,
    status: "proposed",
    decidedBy: null,
    decidedAt: null,
  };
}

function requireProposed(decision: CatalogRoutingDecision): void {
  if (decision.status !== "proposed") {
    throw new Error(`Cannot decide on a routing decision already in status "${decision.status}"`);
  }
}

function requireAuthorizedActor(actor: RoutingActor): void {
  if (!actor.isFounderOrAuthorized) {
    throw new RoutingAuthorizationError("Only the founder or an authorized human may decide a routing proposal");
  }
}

/**
 * Hard policy flags override recommendations even at approval time — an
 * approval attempt for an action a flag blocks is rejected before it can
 * take effect.
 */
export function approveRoutingDecision(
  decision: CatalogRoutingDecision,
  actor: RoutingActor,
  now: string,
  opts?: { flags?: PolicyFlag[]; gatedAction?: PolicyGatedAction }
): CatalogRoutingDecision {
  requireProposed(decision);
  requireAuthorizedActor(actor);

  if (opts?.flags && opts.gatedAction && overridesRecommendation(opts.flags, opts.gatedAction)) {
    return { ...decision, status: "rejected" as RoutingDecisionStatus, decidedBy: actor.id, decidedAt: now };
  }

  return { ...decision, status: "approved", decidedBy: actor.id, decidedAt: now };
}

export function rejectRoutingDecision(decision: CatalogRoutingDecision, actor: RoutingActor, now: string): CatalogRoutingDecision {
  requireProposed(decision);
  requireAuthorizedActor(actor);
  return { ...decision, status: "rejected", decidedBy: actor.id, decidedAt: now };
}
