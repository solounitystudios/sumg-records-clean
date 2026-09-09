import type { PolicyFlag } from "./types";

export type PolicyGatedAction =
  | "release"
  | "program"
  | "distribute"
  | "sync"
  | "ai_train"
  | "publish"
  | "delete";

/**
 * Hard policy flags override every recommendation and every automation
 * (Part 10). This table is the single source of truth for what each flag
 * blocks — routing recipes, destination approvals, and delete authorization
 * all consult it instead of re-encoding their own rules.
 */
const FLAG_BLOCKS: Record<PolicyFlag, PolicyGatedAction[]> = {
  DO_NOT_RELEASE: ["release", "publish"],
  DO_NOT_PROGRAM: ["program"],
  DO_NOT_DISTRIBUTE: ["distribute"],
  DO_NOT_SYNC: ["sync"],
  DO_NOT_TRAIN_AI: ["ai_train"],
  DO_NOT_PUBLISH: ["publish"],
  DO_NOT_DELETE: ["delete"],
  PRIVATE_PERSONAL: ["release", "publish", "distribute", "sync", "program"],
  RIGHTS_HOLD: ["release", "publish", "distribute", "sync", "program", "ai_train"],
};

export function blockedActionsForFlag(flag: PolicyFlag): PolicyGatedAction[] {
  return FLAG_BLOCKS[flag];
}

/** True if any flag in the set blocks the given action. */
export function isActionBlocked(flags: PolicyFlag[], action: PolicyGatedAction): boolean {
  return flags.some((flag) => FLAG_BLOCKS[flag].includes(action));
}

export interface PolicyGateResult {
  allowed: boolean;
  blockedBy: PolicyFlag[];
}

/**
 * Evaluates an action against a flag set and returns which flags (if any)
 * blocked it — used to surface `policyReason` on a destination assignment or
 * routing decision rejection.
 */
export function evaluatePolicyGate(flags: PolicyFlag[], action: PolicyGatedAction): PolicyGateResult {
  const blockedBy = flags.filter((flag) => FLAG_BLOCKS[flag].includes(action));
  return { allowed: blockedBy.length === 0, blockedBy };
}

/**
 * Hard policy flags always win over a routing recommendation or AI
 * suggestion, regardless of confidence or source rank — this is intentionally
 * independent of the provenance precedence model (policy is not "outranked,"
 * it's a separate, absolute gate).
 */
export function overridesRecommendation(flags: PolicyFlag[], recommendedAction: PolicyGatedAction): boolean {
  return isActionBlocked(flags, recommendedAction);
}
