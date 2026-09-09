import type { ProvenanceAuthority, ProvenanceSource, ProvenanceValue } from "./types";

/**
 * Precedence order per docs/SUMG_CATALOG_COMMAND_CENTER_ARCHITECTURE.md §2:
 * FOUNDER/EDITOR CANONICAL > RIGHTS/POLICY > MEASURED/DETERMINISTIC > TELEMETRY > AI SUGGESTION.
 * Higher number wins.
 */
const SOURCE_RANK: Record<ProvenanceSource, number> = {
  founder_assigned: 50,
  editor_assigned: 50,
  imported_source: 20,
  measured: 30,
  deterministic: 30,
  telemetry_learned: 10,
  ai_inferred: 0,
};

const AUTHORITY_RANK: Record<ProvenanceAuthority, number> = {
  canonical: 40,
  policy: 45,
  derived: 20,
  suggestion: 0,
};

function rank(candidate: ProvenanceValue<unknown>): number {
  return AUTHORITY_RANK[candidate.authority] * 1000 + SOURCE_RANK[candidate.source];
}

export function isCanonical(candidate: ProvenanceValue<unknown>): boolean {
  return candidate.authority === "canonical" || candidate.authority === "policy";
}

export function isAiSuggested(candidate: ProvenanceValue<unknown>): boolean {
  return candidate.source === "ai_inferred" || candidate.source === "telemetry_learned";
}

/**
 * True if `incoming` is permitted to overwrite `current`. AI/telemetry can
 * never overwrite a canonical (editor/founder) or policy value — this is the
 * one invariant the whole provenance model exists to protect.
 */
export function canOverwrite<T>(current: ProvenanceValue<T> | undefined, incoming: ProvenanceValue<T>): boolean {
  if (!current) return true;
  if (isCanonical(current) && isAiSuggested(incoming)) return false;
  return rank(incoming) >= rank(current);
}

export class ProvenanceOverwriteError extends Error {
  constructor(field: string) {
    super(`Cannot overwrite canonical value for "${field}" with a lower-precedence source`);
    this.name = "ProvenanceOverwriteError";
  }
}

/**
 * Applies `canOverwrite` and throws instead of silently dropping the write.
 * Callers that want a non-throwing check should use `canOverwrite` directly.
 */
export function assertCanOverwrite<T>(
  field: string,
  current: ProvenanceValue<T> | undefined,
  incoming: ProvenanceValue<T>
): void {
  if (!canOverwrite(current, incoming)) {
    throw new ProvenanceOverwriteError(field);
  }
}

/** Picks the winning value among candidates for the same field; ties broken by most recent observedAt. */
export function resolveValue<T>(candidates: ProvenanceValue<T>[]): ProvenanceValue<T> | undefined {
  if (candidates.length === 0) return undefined;
  return [...candidates].sort((a, b) => {
    const rankDiff = rank(b) - rank(a);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime();
  })[0];
}

export function requireConfidence(candidate: ProvenanceValue<unknown>): void {
  if (isAiSuggested(candidate) && candidate.confidence === undefined) {
    throw new Error("ai_inferred and telemetry_learned values must carry a confidence score");
  }
}
