import type { CatalogAssetLineageEdge } from "./types";

export class LineageCycleError extends Error {
  constructor(assetVersionId: string) {
    super(`Adding this derivation would create a cycle at asset version "${assetVersionId}"`);
    this.name = "LineageCycleError";
  }
}

function wouldCreateCycle(edges: CatalogAssetLineageEdge[], childId: string, newParentId: string): boolean {
  // Would create a cycle if newParentId is already a descendant of childId.
  const stack = [childId];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === newParentId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.parentAssetVersionId === current) stack.push(edge.assetVersionId);
    }
  }
  return false;
}

/**
 * Adds a derivation edge (parent -> child). Throws if the edge would create a
 * cycle or if the child would become its own parent. No orphan derivatives:
 * every derivative must point to a parent (Part 13) — parentAssetVersionId is
 * required here even though it is nullable at the schema level for a root
 * (non-derived) asset version.
 */
export function addLineageEdge(
  edges: CatalogAssetLineageEdge[],
  childAssetVersionId: string,
  parentAssetVersionId: string,
  derivationType: string,
  now: string
): CatalogAssetLineageEdge[] {
  if (childAssetVersionId === parentAssetVersionId) {
    throw new LineageCycleError(childAssetVersionId);
  }
  if (wouldCreateCycle(edges, childAssetVersionId, parentAssetVersionId)) {
    throw new LineageCycleError(childAssetVersionId);
  }

  const newEdge: CatalogAssetLineageEdge = {
    id: `${parentAssetVersionId}->${childAssetVersionId}`,
    assetVersionId: childAssetVersionId,
    parentAssetVersionId,
    derivationType,
    createdAt: now,
  };
  return [...edges, newEdge];
}

export function getParent(edges: CatalogAssetLineageEdge[], assetVersionId: string): string | null {
  return edges.find((e) => e.assetVersionId === assetVersionId)?.parentAssetVersionId ?? null;
}

export function getAncestors(edges: CatalogAssetLineageEdge[], assetVersionId: string): string[] {
  const ancestors: string[] = [];
  let current = getParent(edges, assetVersionId);
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    ancestors.push(current);
    seen.add(current);
    current = getParent(edges, current);
  }
  return ancestors;
}

export function getDescendants(edges: CatalogAssetLineageEdge[], assetVersionId: string): string[] {
  const descendants: string[] = [];
  const stack = [assetVersionId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const edge of edges) {
      if (edge.parentAssetVersionId === current && !seen.has(edge.assetVersionId)) {
        seen.add(edge.assetVersionId);
        descendants.push(edge.assetVersionId);
        stack.push(edge.assetVersionId);
      }
    }
  }
  return descendants;
}

// ─── Duplicates (Part 14) ────────────────────────────────────────────────────

/**
 * The three duplicate categories from Part 14 are kept conceptually distinct
 * and are never conflated:
 * - `exact_duplicate` — hash-identical.
 * - `version_relationship` — same work, different mix/edit/master. Not
 *   determinable from a hash comparison alone; a future function that has
 *   access to work/recording identity would produce this, not
 *   `classifyDuplicate`.
 * - `unknown` — no exact-hash match and no other signal was compared. This is
 *   an honest "we don't know," never a claim of acoustic evidence — acoustic
 *   similarity (Part 14's third category) requires an actual fingerprint or
 *   embedding comparison, which does not exist in this pass, so this
 *   function never returns anything that implies acoustic evidence was
 *   checked.
 */
export type DuplicateRelationship = "exact_duplicate" | "version_relationship" | "unknown";

/**
 * Exact hashes identify exact duplicates — nothing else does, at this layer.
 * A differing (or missing) hash is classified `unknown`, never as any form
 * of similarity, since no acoustic comparison has actually been performed.
 */
export function classifyDuplicate(a: { sha256: string | null }, b: { sha256: string | null }): DuplicateRelationship {
  if (a.sha256 && b.sha256 && a.sha256 === b.sha256) return "exact_duplicate";
  return "unknown";
}

/**
 * This module never deletes anything — classification is informational only.
 * Auto-deletion of uncertain duplicates is explicitly disallowed (Part 14).
 */
export function isSafeToAutoDelete(_relationship: DuplicateRelationship): false {
  return false;
}
